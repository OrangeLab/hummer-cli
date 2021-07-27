import * as WebSocket from 'ws'
import { EventEmitter } from 'events'
import type { Server as HttpServer, IncomingMessage } from 'http'
import type { AddressInfo } from 'net'
import { Tenon } from './Tenon'
const { getHost } = require('./utils')
const Url = require('url')

const WS_NATIVE_URL = '/proxy/native';
const WS_TENON_URL = '/proxy/tenon';
const WS_CLIENT_URL = '/proxy/client';
const INTERNAL_ERROR_CODE = 1011;

// interface Msg {
//   type?:string
//   method?:string
//   params: any
// }

export class ProxyServer {
  private _serverAddressWithPort: String = ''
  private _tenonEmit: EventEmitter = new EventEmitter()
  private _tenons: Map<number, Tenon> = new Map()
  private _tenonCount: number = 1
  private _clientSocket?: WebSocket
  //@ts-ignore
  private _nativeSocket?: WebSocket

  constructor() {
    this._addTenonEmitListener()
  }

  addWebSocketListener(server: HttpServer) {
    const { port } = server.address() as AddressInfo
    this._serverAddressWithPort = `${getHost()}:${port}`;
    this._addConnectionHandler(server)
  }
  // @ts-ignore
  _addConnectionHandler(server: HttpServer) {
    const clientWss = new WebSocket.Server({ noServer: true })
    const tenonWss = new WebSocket.Server({ noServer: true })
    const nativeWss = new WebSocket.Server({ noServer: true })
    console.warn(`web socket server listening, native can connect ws server by ws://${this._serverAddressWithPort}${WS_NATIVE_URL} ...`)
    console.warn(`web socket server listening, client can connect ws server by ws://${this._serverAddressWithPort}${WS_CLIENT_URL} ...`)
    console.warn(`web socket server listening, tenon can connect ws server by ws://${this._serverAddressWithPort}${WS_TENON_URL} ...`)
    nativeWss.on('connection', (socket, request) => {
      console.log('nativeWss connection')
      // @ts-ignore
      this._addNativeMsgListener(socket, request, nativeWss)
    })
    clientWss.on('connection', (socket, request) => {
      console.log('clientWss connection')
      // @ts-ignore
      this._addClientMsgListener(socket, request, clientWss)
    })
    tenonWss.on('connection', (socket, request) => {
      console.log('tenonWss connection')
      // @ts-ignore
      this._addTenonMsgListener(socket, request, clientWss)
    })
    server.on('upgrade', (request, socket, head) => {
      const { pathname } = Url.parse(request.url)
      if (pathname === WS_NATIVE_URL) {
        nativeWss.handleUpgrade(request, socket, head, (ws) => {
          nativeWss.emit('connection', ws, request)
        })
      } else if (pathname === WS_CLIENT_URL) {
        clientWss.handleUpgrade(request, socket, head, (ws) => {
          clientWss.emit('connection', ws, request)
        })
      } else if (pathname === WS_TENON_URL) {
        tenonWss.handleUpgrade(request, socket, head, (ws) => {
          tenonWss.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })
  }
  // @ts-ignore
  _addNativeMsgListener(socket: WebSocket, request: IncomingMessage, nativeWss: WebSocket.Server) {
    try {
      this._nativeSocket = socket
      socket.on('message', (message:string) => {
        console.log('native msg', message)
        this._handleNativeMsg(message)
      })
      socket.on('close', () => {
        this._nativeSocket = undefined
      })
    } catch (error) {
      console.error(error);
      socket.close(INTERNAL_ERROR_CODE, error);
    }
  }
   // @ts-ignore
   _addTenonMsgListener(socket: WebSocket, request: IncomingMessage, nativeWss: WebSocket.Server) {
    try {
      // 记录 native 端
      const tenonId = this._tenonCount++
      this._tenons.set(
        tenonId,
        new Tenon(tenonId, '', socket, this._tenonEmit)
      )
      socket.on('close', (msg) => {
        console.log(msg)
        this._tenons.delete(tenonId)
      })
    } catch (error) {
      console.error('error', error);
      socket.close(INTERNAL_ERROR_CODE, error);
    }
  }

  // @ts-ignore
  _addClientMsgListener(socket: WebSocket, request: IncomingMessage, clientWss: WebSocket.Server) {
    try {
      this._clientSocket = socket
      socket.on('message', (message:string) => {
        console.log('recevie msg from client >>>>', message)
        this._handleClientMsg(message)
      })
      socket.on('close', () => {
        this._clientSocket = undefined
      })
    } catch (error) {
      console.error(error);
      socket.close(INTERNAL_ERROR_CODE, error);
    }
  }

  _handleNativeMsg(message:string) {
    this._pushMsgToClient(message)
  }

  _handleClientMsg(message:string) {
    try {
      const paresMsg = JSON.parse(message)
      if (paresMsg.hasOwnProperty('type') && paresMsg.hasOwnProperty('method')) {
        this._handleMsgByType(paresMsg)
      } else {
        this.pushMsgToTenons(paresMsg)
      }
    } catch (error) {
      console.log('_handleClientMsg has error', error)
    }
  }

  _handleMsgByType(msg:any) {
    if (msg.type == 'page') {
      this._handlePageMethod(msg)
    } else if (msg.type == 'view') {
      this._handleViewMethod(msg)
    } else {
      // Todo: 非协议类型字段 type
    }
  }

  _handlePageMethod(msg:any) {
    const method = msg.method
    switch (method) {
      case 'getPageList':
        const data = this._getCurActiveTenons()
        const msg = {
          type: 'page',
          method: 'sendPageList',
          data
        }
        this._pushMsgToClient(msg)
        break;
      default:
        break;
    }
  }

  // TODO:处理参数
  _handleViewMethod(msg:any) {
    const { tenonId } = msg.params
    const tenon = this._tenons.get(tenonId)
    tenon && tenon.sendMsgToTenon(msg)
    // switch (method) {
    //   case 'getViewTree':
    //     {
    //       const { tenonId } = params
    //       const tenon = this._tenons.get(tenonId)
    //       tenon && tenon.sendMsgToTenon(msg)
    //     }
    //     break;
    //   case 'highlightView':
    //     {
    //       const { tenonId, viewId } = params
    //       const tenon = this._tenons.get(tenonId)
    //       tenon && tenon.sendMsgToTenon(msg)
    //     }
    //     break;
    //   case 'getViewDetail':
    //     break;
    //   default:
    //     break;
    // }
  }

  pushMsgToTenons(message: any) {
    Array.from(this._tenons.entries()).forEach(
      ([tenonId, tenon]) => {
        console.log('tenonId', tenonId, 'message', message)
        tenon.sendMsgToTenon(message)
      }
    )
  }

  _getCurActiveTenons() {
    return Array.from(this._tenons.entries()).map( 
      ([tenonId]) => ({ tenonId }) 
    )
  }

  _addTenonEmitListener() {
    this._tenonEmit.on('message', (message, tenonInfo) => {
      console.log('proxy recevie msg from tenon >>>>>> ', message, tenonInfo)
      this._handleTenonEmitMsg(message, tenonInfo)
    })
  }

  _handleTenonEmitMsg(message: any, tenonInfo: any) {
    // Tip: tenon runtime check
    this._pushMsgToClient(message, tenonInfo)
  }

  // @ts-ignore
  _pushMsgToClient(message: any, tenonInfo?: any) {
    this._clientSocket && this._clientSocket.send(JSON.stringify(message))
  }
}

