import { Device } from './device'
import { IncomingMessage, Server, ServerResponse } from 'http'
import * as url from 'url'
import { AddressInfo } from 'net'
import { DebugSeverDescription, JsonDebugServerListResponse, JsonPagesListResponse, JsonVersionResponse, Page, PageDescription } from './types'
import * as WS from 'ws'
import { LevelLogger } from '@hummer/cli-utils/dist/levelLogger';
import * as address from 'address';
import EventEmitter = require("events");

const needle = require('needle');

const WS_DEVICE_URL = '/inspector/device';
const WS_DEBUGGER_URL = '/inspector/debug';
const PAGES_LIST_JSON_URL = '/json';
const PAGES_LIST_JSON_URL_2 = '/json/list';
const PAGES_DEV_LIST_JSON_URL = '/dev/page/list';

export const DEBUGSERVER_LIST_JSON_URL = '/debug/server/list';
export const DEBUG_START_JSON_URL = '/debug/start';
export const DEBUG_END_JSON_URL = '/debug/end';
export const DEBUG_SERVER_CHECK_JSON_URL = '/debug/server/check';


const PAGES_LIST_JSON_VERSION_URL = '/json/version';

const INTERNAL_ERROR_CODE = 1011;

interface DebuggeeListResponse {
  code: number,
  data: Array<string>
}

/**
 * Main Inspector Proxy class that connects JavaScript VM inside Android/iOS apps and JS debugger.
 */
export class InspectorProxy {

  // Root of the project used for relative to absolute source path conversion.
  _debugServerMap: Map<number, ChildDebugSever>;

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

  constructor(projectRoot?: string) {
    this._devices = new Map();
    this._debugServerMap = new Map();
  }
  // Process HTTP request sent to server. We only respond to 2 HTTP requests:
  // 1. /json/version returns Chrome debugger protocol version that we use
  // 2. /json and /json/list returns list of page descriptions (list of inspectable apps).
  // This list is combined from all the connected devices.
  processRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    
    let parseUrl = url.parse(request.url, true);
    if (
      parseUrl.pathname === PAGES_LIST_JSON_URL ||
      parseUrl.pathname === PAGES_LIST_JSON_URL_2
    ) {
      // Build list of pages from all devices.
      const devPort = (parseUrl.query ? parseUrl.query : {})["devPort"] as string;
      let result = new Array<PageDescription>();
      Array.from(this._devices.entries()).forEach(
        ([deviceId, device]) => {
          result = result.concat(
            device
              .getPagesList()
              .map((page: Page) =>
                this._buildPageDescription(deviceId, device, page),
              ).filter((pageDescription : PageDescription)=>{
                let title = url.parse(pageDescription.title, false); 
                if (devPort){
                  return title.port === devPort;
                }               
                return true;
              })
          );
        },
      );

      this._sendJsonResponse(response, result);
    } else if (request.url === PAGES_LIST_JSON_VERSION_URL) {
      this._sendJsonResponse(response, {
        Browser: 'Mobile JavaScript',
        'Protocol-Version': '1.1',
      });
    } else if (parseUrl.pathname === PAGES_DEV_LIST_JSON_URL) {

      const protocol = 'http';
      const devPort = (parseUrl.query ? parseUrl.query : {})["devPort"] as string;
      const ip = address.ip();
      Promise.race([this._getDevFileDelay(100), this._getDevFileList(parseInt(devPort))]).then((res) => {
        res.data = res.data.map((fileName) => {
          const url = `${protocol}://${ip}:${devPort}/${fileName}`;
          return url;
        })
        this._sendJsonResponse(response, res);
      });
    } else if (request.url === DEBUGSERVER_LIST_JSON_URL) {

      const debugList = new Array<DebugSeverDescription>();
      this._debugServerMap.forEach((val, k) => {
        debugList.push(val.entry);
      })
      this._sendJsonResponse(response, debugList);
    } else if (request.url === DEBUG_START_JSON_URL || request.url === DEBUG_END_JSON_URL) {
      let body = '';
      request.on('data', chunk => {
        body += chunk.toString();
      });
      request.on('end', () => {
        const bodyData = JSON.parse(body);
        if (bodyData.devPort) {
          if (request.url === DEBUG_START_JSON_URL) {
            let cds = new ChildDebugSever(bodyData as DebugSeverDescription);
            this._debugServerMap.set(bodyData.devPort, cds);
            cds.connectEvent.on("disconnected",()=>{
              this._debugServerMap.delete(bodyData.devPort);
              this._checkShouldTermniated();
            })
            cds.start()
          } else {
            let cds = this._debugServerMap.get(bodyData.devPort);
            if (cds){
              cds.end();
              this._debugServerMap.delete(bodyData.devPort);
            }
          }
        }
        this._sendJsonResponse(response, {});
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
    object: JsonPagesListResponse | JsonVersionResponse | JsonDebugServerListResponse | any,
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
          new Device(deviceId, deviceName, appName, socket, this._debugServerMap),
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
        LevelLogger.debug(`new debugger for ${pageId} connected`);
        device.handleDebuggerConnection(socket, pageId);
        socket.on('close', () => {
          LevelLogger.debug(`debugger for ${pageId} disconnected`);
        })
      } catch (e) {
        console.error(e);
        socket.close(INTERNAL_ERROR_CODE, e);
      }
    });
    return wss;
  }

  _getDevFileList(devPort:number): Promise<DebuggeeListResponse> {
    const defaultResponse = {
      code: 0,
      data: new Array()
    };

    return new Promise((resolve) => {
      needle('get', `http://localhost:${devPort}/fileList`, {}, { json: true })
        .then((resp: any) => {
          resolve(resp.body);

        }).catch((e: any) => {
          resolve(defaultResponse);
        });
    })
  }
  _getDevFileDelay(duration: number): Promise<DebuggeeListResponse> {
    const defaultResponse = {
      code: 0,
      data: new Array()
    };
    return new Promise<any>(resolve => setTimeout(() => { resolve(defaultResponse) }, duration))
  }

  _checkShouldTermniated(){
    if (this._debugServerMap.size == 0) {
      LevelLogger.info("Global Debug Service Has Started!");
      process.exit();
    }
  }
}

export class ChildDebugSever {

  public connectEvent = new EventEmitter();
  private isStop : boolean = false;
  constructor(public entry:DebugSeverDescription){}
  public start() {

    this._serverCheckLoop()
  }

  private async _serverCheckLoop() {

    let promise = Promise.race([this._severCheckDelay(100), this._severCheck()])
    let isAlive = await promise;    
    if(isAlive && this.isStop == false) {
      setTimeout(() => {
        this._serverCheckLoop()
      }, 2000);
    }else{
      this.connectEvent.emit("disconnected")
    }
  }

  private _severCheck(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      needle('get', `http://localhost:${this.entry.debugPort}${DEBUG_SERVER_CHECK_JSON_URL}`, {}, { json: true })
        .then((resp: any) => {
          resolve(true);

        }).catch((e: any) => {
          resolve(false);
        });
    })
  }
  private _severCheckDelay(duration: number): Promise<DebuggeeListResponse> {

    return new Promise<any>(resolve => setTimeout(() => { resolve(false) }, duration))
  }

  public end() {
    this.isStop = true;
  }
}