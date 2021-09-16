import { Device } from './device'
import { IncomingMessage, Server, ServerResponse } from 'http'
import * as url from 'url'
import { AddressInfo } from 'net'
import { JsonPagesListResponse, JsonVersionResponse, Page, PageDescription } from './types'
import * as WS from 'ws'
import { LevelLogger } from '@hummer/cli-utils/dist/levelLogger';

const WS_DEVICE_URL = '/inspector/device';
const WS_DEBUGGER_URL = '/inspector/debug';
const PAGES_LIST_JSON_URL = '/json';
const PAGES_LIST_JSON_URL_2 = '/json/list';
const PAGES_LIST_JSON_VERSION_URL = '/json/version';

const INTERNAL_ERROR_CODE = 1011;


/**
 * Main Inspector Proxy class that connects JavaScript VM inside Android/iOS apps and JS debugger.
 */
export class InspectorProxy {
  // Root of the project used for relative to absolute source path conversion.
  _projectRoot: string;

  // Maps device ID to Device instance.
  _devices: Map<number, Device>;

  // Internal counter for device IDs -- just gets incremented for each new device.
  _deviceCounter: number = 0;

  // We store server's address with port (like '127.0.0.1:8081') to be able to build URLs
  // (devtoolsFrontendUrl and webSocketDebuggerUrl) for page descriptions. These URLs are used
  // by debugger to know where to connect.
  _serverAddressWithPort: string = '';

  constructor(projectRoot: string) {
    this._projectRoot = projectRoot;
    this._devices = new Map();
  }

  // Process HTTP request sent to server. We only respond to 2 HTTP requests:
  // 1. /json/version returns Chrome debugger protocol version that we use
  // 2. /json and /json/list returns list of page descriptions (list of inspectable apps).
  // This list is combined from all the connected devices.
  processRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    if (
      request.url === PAGES_LIST_JSON_URL ||
      request.url === PAGES_LIST_JSON_URL_2
    ) {
      // Build list of pages from all devices.
      let result = new Array<PageDescription>();
      Array.from(this._devices.entries()).forEach(
        ([deviceId, device]) => {
          result = result.concat(
            device
              .getPagesList()
              .map((page: Page) =>
                this._buildPageDescription(deviceId, device, page),
              ),
          );
        },
      );

      this._sendJsonResponse(response, result);
    } else if (request.url === PAGES_LIST_JSON_VERSION_URL) {
      this._sendJsonResponse(response, {
        Browser: 'Mobile JavaScript',
        'Protocol-Version': '1.1',
      });
    }
  }

  // Adds websocket listeners to the provided HTTP/HTTPS server.
  addWebSocketListener(server: Server) {
    const addressInfo = server.address() as AddressInfo;
    if (addressInfo.family === 'IPv6') {
      this._serverAddressWithPort = `[::1]:${addressInfo.port}`;
    } else {
      this._serverAddressWithPort = `localhost:${addressInfo.port}`;
    }
    return {
      [WS_DEVICE_URL]: this._addDeviceConnectionHandler(server),
      [WS_DEBUGGER_URL]: this._addDebuggerConnectionHandler(server),
    };
  }

  // Converts page information received from device into PageDescription object
  // that is sent to debugger.
  _buildPageDescription(
    deviceId: number,
    device: Device,
    page: Page,
  ): PageDescription {
    const debuggerUrl = `${this._serverAddressWithPort}${WS_DEBUGGER_URL}?device=${deviceId}&page=${page.id}`;
    const webSocketDebuggerUrl = 'ws://' + debuggerUrl;
    const devtoolsFrontendUrl =
      'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=' +
      encodeURIComponent(debuggerUrl);
    return {
      id: `${deviceId}-${page.id}`,
      description: page.app,
      title: page.title,
      faviconUrl: 'https://reactjs.org/favicon.ico',
      devtoolsFrontendUrl,
      type: 'node',
      webSocketDebuggerUrl,
      vm: page.vm,
    };
  }

  // Sends object as response to HTTP request.
  // Just serializes object using JSON and sets required headers.
  _sendJsonResponse(
    response: ServerResponse,
    object: JsonPagesListResponse | JsonVersionResponse,
  ) {
    const data = JSON.stringify(object, null, 2);
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache',
      'Content-Length': data.length.toString(),
      Connection: 'close',
    });
    response.end(data);
  }

  // Adds websocket handler for device connections.
  // Device connects to /inspector/device and passes device and app names as
  // HTTP GET params.
  // For each new websocket connection we parse device and app names and create
  // new instance of Device class.
  _addDeviceConnectionHandler(server: Server) {
    const wss = new WS.Server({
      noServer: true,
      perMessageDeflate: true,
    });
    // $FlowFixMe[value-as-type]
    wss.on('connection', async (socket: WS, req) => {
      try {
        const query = url.parse(req.url || '', true).query || {};
        const deviceName = query.name as string || 'Unknown';
        const appName = query.app as string || 'Unknown';
        const deviceId = this._deviceCounter++;
        this._devices.set(
          deviceId,
          new Device(deviceId, deviceName, appName, socket, this._projectRoot),
        );

        LevelLogger.debug(`Got new connection: device=${deviceName}, app=${appName}`);

        socket.on('close', () => {
          this._devices.delete(deviceId);
          LevelLogger.debug(`Device ${deviceName} disconnected.`);
        });
      } catch (e) {
        LevelLogger.error(e);
        socket.close(INTERNAL_ERROR_CODE, e);
      }
    });
    return wss;
  }

  // Adds websocket handler for debugger connections.
  // Debugger connects to webSocketDebuggerUrl that we return as part of page description
  // in /json response.
  // When debugger connects we try to parse device and page IDs from the query and pass
  // websocket object to corresponding Device instance.
  _addDebuggerConnectionHandler(server: Server) {
    const wss = new WS.Server({
      noServer: true,
      perMessageDeflate: false,
    });
    // $FlowFixMe[value-as-type]
    wss.on('connection', async (socket: WS, req) => {
      try {
        const query = url.parse(req.url || '', true).query || {};
        const deviceId = query.device as string;
        const pageId = query.page as string;

        if (deviceId == null || pageId == null) {
          throw new Error('Incorrect URL - must provide device and page IDs');
        }

        const device = this._devices.get(parseInt(deviceId, 10));
        if (device == null) {
          throw new Error('Unknown device with ID ' + deviceId);
        }

        device.handleDebuggerConnection(socket, pageId);
        socket.on('close',()=>{
          console.log('2')
        })
      } catch (e) {
        console.error(e);
        socket.close(INTERNAL_ERROR_CODE, e);
      }
    });
    return wss;
  }
}