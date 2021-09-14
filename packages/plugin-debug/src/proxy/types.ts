
// Page information received from the device. New page is created for
// each new instance of VM and can appear when user reloads React Native
// application.
export interface Page {
    id: string,
    title: string,
    vm: string,
    app: string,
  };
  
  // Chrome Debugger Protocol message/event passed between device and debugger.
  export interface WrappedEvent {
    event: 'wrappedEvent',
    payload: {
      pageId: string,
      wrappedEvent: string,
    },
  };
  
  // Request sent from Inspector Proxy to Device when new debugger is connected
  // to particular page.
  export interface ConnectRequest  {
    event: 'connect',
    payload: {pageId: string},
  };
  
  // Request sent from Inspector Proxy to Device to notify that debugger is
  // disconnected.
  export interface DisconnectRequest  {
    event: 'disconnect',
    payload: {pageId: string},
  };
  
  // Request sent from Inspector Proxy to Device to get a list of pages.
  export interface GetPagesRequest  {event: 'getPages'};
  
  // Response to GetPagesRequest containing a list of page infos.
  export interface GetPagesResponse  {
    event: 'getPages',
    payload: Array<Page>,
  };
  
  // Union type for all possible messages sent from device to Inspector Proxy.
  export type MessageFromDevice = (GetPagesResponse | WrappedEvent | DisconnectRequest)
  
  // Union type for all possible messages sent from Inspector Proxy to device.
  export type MessageToDevice = (GetPagesRequest | WrappedEvent | ConnectRequest | DisconnectRequest);
  
  // Page description object that is sent in response to /json HTTP request from debugger.
  export interface PageDescription  {
    id: string,
    description: string,
    title: string,
    faviconUrl: string,
    devtoolsFrontendUrl: string,
    type: string,
    webSocketDebuggerUrl: string,
    vm:string
  };
  export type JsonPagesListResponse = Array<PageDescription>;
  
  // Response to /json/version HTTP request from the debugger specifying browser type and
  // Chrome protocol version.
  export interface JsonVersionResponse  {
    Browser: string,
    'Protocol-Version': string,
  };
  
  /**
   * Types were exported from https://github.com/ChromeDevTools/devtools-protocol/blob/master/types/protocol.d.ts
   */
  
  export interface SetBreakpointByUrlRequest {
    id: number,
    method: 'Debugger.setBreakpointByUrl',
    params: {
      lineNumber: number,
      url?: string,
      urlRegex?: string,
      scriptHash?: string,
      columnNumber?: number,
      condition?: string,
    },
  };
  
  export interface SetBreakpointByUrlResponse  {
    breakpointId: string,
    locations: {
      scriptId: string,
      lineNumber: number,
      columnNumber?: number,
    }[],
  };
  
  export interface GetScriptSourceRequest  {
    id: number,
    method: 'Debugger.getScriptSource',
    params: {
      scriptId: string,
    },
  };
  
  export interface GetScriptSourceResponse  {
    scriptSource: string,
    /**
     * Wasm bytecode.
     */
    bytecode?: string,
  };
  
  export type DebuggerRequest = (SetBreakpointByUrlRequest | GetScriptSourceRequest);
  
  export interface DebuggerResponse {
    id: number,
    result: SetBreakpointByUrlResponse | GetScriptSourceResponse,
  };