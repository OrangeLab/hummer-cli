
import * as fs from 'fs';
import * as path from 'path';
import { DebuggerRequest, DebuggerResponse, GetScriptSourceRequest, GetScriptSourceResponse, MessageFromDevice, MessageToDevice, Page, SetBreakpointByUrlRequest } from './types';
import * as WS from 'ws'
import { LevelLogger } from '@hummer/cli-utils';


const PAGES_POLLING_INTERVAL = 1000;


// Android's stock emulator and other emulators such as genymotion use a standard localhost alias.
const EMULATOR_LOCALHOST_ADDRESSES: Array<string> = ['10.0.2.2', '10.0.3.2'];

// Prefix for script URLs that are alphanumeric IDs. See comment in _processMessageFromDevice method for
// more details.
const FILE_PREFIX = 'file://';

interface DebuggerInfo {
  // Debugger web socket connection
  socket: WS,
  // If we replaced address (like '10.0.2.2') to localhost we need to store original
  // address because Chrome uses URL or urlRegex params (instead of scriptId) to set breakpoints.
  originalSourceURLAddress?: string,
  prependedFilePrefix: boolean,
  pageId: string,
};


/**
 * Device class represents single device connection to Inspector Proxy. Each device
 * can have multiple inspectable pages.
 */
export class Device {
  // ID of the device.
  _id: number;

  // Name of the device.
  _name: string;

  // Package name of the app.
  _app: string;

  // Stores socket connection between Inspector Proxy and device.
  _deviceSocket: WS;

  // Stores last list of device's pages.
  _pages: Array<Page>;

  // Stores information about currently connected debugger (if any).
  _debuggerConnectionMap = new Map<string, DebuggerInfo>();

  // Last known Page ID of the React Native page.
  // This is used by debugger connections that don't have PageID specified
  // (and will interact with the latest React Native page).
  _lastConnectedReactNativePage: Page = null;

  // Whether we are in the middle of a reload in the REACT_NATIVE_RELOADABLE_PAGE.
  _isReloading: boolean = false;

  // The previous "GetPages" message, for deduplication in debug logs.
  _lastGetPagesMessage: string = '';

  // Mapping built from scriptParsed events and used to fetch file content in `Debugger.getScriptSource`.
  _scriptIdToSourcePathMapping: Map<string, string> = new Map();

  // Root of the project used for relative to absolute source path conversion.
  _projectRoot: string;

  constructor(
    id: number,
    name: string,
    app: string,
    socket: WS,
    projectRoot: string,
  ) {
    this._id = id;
    this._name = name;
    this._app = app;
    this._pages = [];
    this._deviceSocket = socket;
    this._projectRoot = projectRoot;

    this._deviceSocket.on('message', (message: string) => {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.event === 'getPages') {
        // There's a 'getPages' message every second, so only show them if they change
        if (message !== this._lastGetPagesMessage) {
          LevelLogger.debug(
            '(Debugger)    (Proxy) <- (Device), getPages ping has changed: ' +
            message,
          );
          this._lastGetPagesMessage = message;
        }
      } else {
        LevelLogger.debug('(Debugger)    (Proxy) <- (Device): ' + message);
      }
      this._handleMessageFromDevice(parsedMessage);
    });
    this._deviceSocket.on('close', () => {
      // Device disconnected - close debugger connection.
      this._debuggerConnectionMap.forEach((debuggerInfo, pageId, map) => {
        debuggerInfo.socket.close();
      })
      this._debuggerConnectionMap = new Map<string, DebuggerInfo>();
    });

    this._setPagesPolling();
  }

  getPagesList(): Array<Page> {

    return this._pages;
  }

  // Handles new debugger connection to this device:
  // 1. Sends connect event to device
  // 2. Forwards all messages from the debugger to device as wrappedEvent
  // 3. Sends disconnect event to device when debugger connection socket closes.
  handleDebuggerConnection(socket: WS, pageId: string) {
    const _debuggerConnection = this._debuggerConnectionMap.get(pageId);
    // Disconnect current debugger if we already have debugger connected.
    if (_debuggerConnection) {
      _debuggerConnection.socket.close();

      this._debuggerConnectionMap.delete(pageId);
    }

    const debuggerInfo = {
      socket,
      prependedFilePrefix: false,
      pageId,
    };
    this._debuggerConnectionMap.set(pageId,debuggerInfo);

    LevelLogger.debug(`Got new debugger connection for page ${pageId} of ${this._name}`);

    this._sendMessageToDevice({
      event: 'connect',
      payload: {
        pageId: this._mapToDevicePageId(pageId),
      },
    });

    socket.on('message', (message: string) => {
      LevelLogger.debug('(Debugger) -> (Proxy)    (Device): ' + message);
      const debuggerRequest = JSON.parse(message);
      const interceptedResponse = this._interceptMessageFromDebugger(
        debuggerRequest,
        debuggerInfo,
      );

      if (interceptedResponse) {
        socket.send(JSON.stringify(interceptedResponse));
      } else {
        this._sendMessageToDevice({
          event: 'wrappedEvent',
          payload: {
            pageId: this._mapToDevicePageId(pageId),
            wrappedEvent: JSON.stringify(debuggerRequest),
          },
        });
      }
    });
    socket.on('close', () => {
      LevelLogger.debug(`Debugger for page ${pageId} and ${this._name} disconnected.`);
      this._sendMessageToDevice({
        event: 'disconnect',
        payload: {
          pageId: this._mapToDevicePageId(pageId),
        },
      });
      this._debuggerConnectionMap.delete(pageId);
    });

    const sendFunc = socket.send;
    socket.send = function (message: string) {
      LevelLogger.debug('(Debugger) <- (Proxy)    (Device): ' + message);
      return sendFunc.call(socket, message);
    };
  }

  // Handles messages received from device:
  // 1. For getPages responses updates local _pages list.
  // 2. All other messages are forwarded to debugger as wrappedEvent.
  //
  // In the future more logic will be added to this method for modifying
  // some of the messages (like updating messages with source maps and file
  // locations).
  _handleMessageFromDevice(message: MessageFromDevice) {
    if (message.event === 'getPages') {
      this._pages = message.payload;

      // Check if device have new React Native page.
      // There is usually no more than 2-3 pages per device so this operation
      // is not expensive.
      // TODO(hypuk): It is better for VM to send update event when new page is
      // created instead of manually checking this on every getPages result.
      for (let i = 0; i < this._pages.length; ++i) {
        if (this._pages[i].title.indexOf('React') >= 0) {
          if (this._pages[i].id != this._lastConnectedReactNativePage?.id) {
            // this._newReactNativePage(this._pages[i]);
            break;
          }
        }
      }
    } else if (message.event === 'disconnect') {
      // inspectable page destory
      const pageId = message.payload.pageId;
      var _debuggerConnection = this._debuggerConnectionMap.get(pageId);
      if (_debuggerConnection) {
        _debuggerConnection.socket.close();
        this._debuggerConnectionMap.delete(pageId);
      }
      // log
    } else if (message.event === 'wrappedEvent') {
      const pageId = message.payload.pageId;
      var _debuggerConnection = this._debuggerConnectionMap.get(pageId);
      if (_debuggerConnection == null) {
        return;
      }

      // FIXME: Is it possible that we received message for pageID that does not
      // correspond to current debugger connection?

      const debuggerSocket = _debuggerConnection.socket;
      if (debuggerSocket == null || debuggerSocket.readyState !== WS.OPEN) {
        // TODO(hypuk): Send error back to device?
        return;
      }

      const parsedPayload = JSON.parse(message.payload.wrappedEvent);

      if (_debuggerConnection) {
        // Wrapping just to make flow happy :)
        this._processMessageFromDevice(parsedPayload, _debuggerConnection);
      }

      const messageToSend = JSON.stringify(parsedPayload);
      debuggerSocket.send(messageToSend);
    }
  }


  // Allows to make changes in incoming message from device.
  _processMessageFromDevice(
    payload: { method: string, params: { sourceMapURL: string, url: string } },
    debuggerInfo: DebuggerInfo,
  ) {
    // Replace Android addresses for scriptParsed event.
    if (payload.method === 'Debugger.scriptParsed') {
      const params = payload.params;
      if ('sourceMapURL' in params) {
        for (let i = 0; i < EMULATOR_LOCALHOST_ADDRESSES.length; ++i) {
          const address = EMULATOR_LOCALHOST_ADDRESSES[i];
          if (params.sourceMapURL.indexOf(address) >= 0) {
            payload.params.sourceMapURL = params.sourceMapURL.replace(
              address,
              'localhost',
            );
            debuggerInfo.originalSourceURLAddress = address;
          }
        }
      }
      if ('url' in params) {
        for (let i = 0; i < EMULATOR_LOCALHOST_ADDRESSES.length; ++i) {
          const address = EMULATOR_LOCALHOST_ADDRESSES[i];
          if (params.url.indexOf(address) >= 0) {
            payload.params.url = params.url.replace(address, 'localhost');
            debuggerInfo.originalSourceURLAddress = address;
          }
        }

        // Chrome doesn't download source maps if URL param is not a valid
        // URL. Some frameworks pass alphanumeric script ID instead of URL which causes
        // Chrome to not download source maps. In this case we want to prepend script ID
        // with 'file://' prefix.
        if (payload.params.url.match(/^[0-9a-z]+$/)) {
          payload.params.url = FILE_PREFIX + payload.params.url;
          debuggerInfo.prependedFilePrefix = true;
        }

        if (params["scriptId"] != null) {
          this._scriptIdToSourcePathMapping.set(params["scriptId"], params.url);
        }
      }
    }

    if (
      payload.method === 'Runtime.executionContextCreated' &&
      this._isReloading
    ) {
      // The new context is ready. First notify Chrome that we've reloaded so
      // it'll resend its breakpoints. If we do this earlier, we may not be
      // ready to receive them.
      debuggerInfo.socket.send(
        JSON.stringify({ method: 'Runtime.executionContextsCleared' }),
      );

      // The VM starts in a paused mode. Ask it to resume.
      // Note that if setting breakpoints in early initialization functions,
      // there's a currently race condition between these functions executing
      // and Chrome re-applying the breakpoints due to the message above.
      //
      // This is not an issue in VSCode/Nuclide where the IDE knows to resume
      // at its convenience.
      this._sendMessageToDevice({
        event: 'wrappedEvent',
        payload: {
          pageId: this._mapToDevicePageId(debuggerInfo.pageId),
          wrappedEvent: JSON.stringify({ method: 'Debugger.resume', id: 0 }),
        },
      });

      this._isReloading = false;
    }
  }


  // Allows to make changes in incoming messages from debugger.
  _interceptMessageFromDebugger(
    req: DebuggerRequest,
    debuggerInfo: DebuggerInfo,
  ): DebuggerResponse {
    let response = null;
    if (req.method === 'Debugger.setBreakpointByUrl') {
      this._processDebuggerSetBreakpointByUrl(req, debuggerInfo);
    } else if (req.method === 'Debugger.getScriptSource') {
      response = {
        id: req.id,
        result: this._processDebuggerGetScriptSource(req),
      };
    }
    return response;
  }

  // Sends single message to device.
  _sendMessageToDevice(message: MessageToDevice) {
    try {
      if (message.event !== 'getPages') {
        LevelLogger.debug('(Debugger)    (Proxy) -> (Device): ' + JSON.stringify(message));
      }
      this._deviceSocket.send(JSON.stringify(message));
    } catch (error) { }
  }


  _processDebuggerGetScriptSource(
    req: GetScriptSourceRequest,
  ): GetScriptSourceResponse {
    let scriptSource = `Source for script with id '${req.params.scriptId}' was not found.`;

    const pathToSource = this._scriptIdToSourcePathMapping.get(
      req.params.scriptId,
    );
    if (pathToSource) {
      try {
        const fs_path = new URL(pathToSource);
        const p = path.join(this._projectRoot,'dist',fs_path.pathname);
        scriptSource = fs.readFileSync(
          p,
          'utf8',
        );
      } catch (err) {
        scriptSource = err.message;
      }
    }

    return {
      scriptSource,
    };
  }

  _processDebuggerSetBreakpointByUrl(
    req: SetBreakpointByUrlRequest,
    debuggerInfo: DebuggerInfo,
  ) {
    // If we replaced Android emulator's address to localhost we need to change it back.
    if (debuggerInfo.originalSourceURLAddress) {
      if (req.params.url) {
        req.params.url = req.params.url.replace(
          'localhost',
          debuggerInfo.originalSourceURLAddress,
        );

        if (
          req.params.url &&
          req.params.url.startsWith(FILE_PREFIX) &&
          debuggerInfo.prependedFilePrefix
        ) {
          // Remove fake URL prefix if we modified URL in _processMessageFromDevice.
          req.params.url = req.params.url.slice(FILE_PREFIX.length);
        }
      }
      if (req.params.urlRegex) {
        req.params.urlRegex = req.params.urlRegex.replace(
          /localhost/g,
          debuggerInfo.originalSourceURLAddress,
        );
      }
    }
  }

  _mapToDevicePageId(pageId: string): string {
    return pageId;
  }
  // Sends 'getPages' request to device every PAGES_POLLING_INTERVAL milliseconds.
  _setPagesPolling() {
    setInterval(
      () => this._sendMessageToDevice({ event: 'getPages' }),
      PAGES_POLLING_INTERVAL,
    );
  }
}
