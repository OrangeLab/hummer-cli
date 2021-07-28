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
        this._handleMethod(paresMsg)
      } else {
        // Todo
      }
    } catch (error) {
      console.log('_handleClientMsg has error', error)
    }
  }

  _handleMethod(msg:any) {
    if (msg.method == 'getPageList') {
      const data = {
        method: 'setPageList',
        data: this._getCurActiveTenons()
      }
      this._pushMsgToClient(data)
    } else if (msg.method == 'getViewTree') {
      const { tenonId } = msg.params
      const tenon = this._tenons.get(tenonId)
      if (tenon) {
        tenon.sendMsgToTenon(msg)
      }
    }
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
    this._tenonEmit.on('tenon', (message, nativeInfo) => {
      console.log('recevie msg from tenon >>> ', message, nativeInfo)
      this._handleTenonEmitMsg(message, nativeInfo)
    })
  }

  _handleTenonEmitMsg(message: any, nativeInfo: any) {
    // Todo: 通知 native 不符合协议
    this._pushMsgToClient(message, nativeInfo)

    // const isLegal = this._validateMessage(message, 'native')
    // if (isLegal) {
    //   this._pushMsgToClient(message, nativeInfo)
    // } else {
    //   // Todo: 通知 native 不符合协议
    //   // this.pushMsgToTenons(message)
    // }
  }

  // Todo: 校验待完善
  _validateMessage(message: any, channel: string) {
    let flag = true
    if (Object.prototype.toString.call(message).slice(8, -1) === 'Object') {
      ['type', 'method', 'params', 'protocol-version'].forEach(key => {
        flag = flag && Object.prototype.hasOwnProperty.call(message, key)
      })
    }
    if (channel === 'native') {
    } else if (channel === 'client') {
    }
    return flag
  }

  // @ts-ignore
  _pushMsgToClient(message: any, nativeInfo?: any) {
    this._clientSocket && this._clientSocket.send(JSON.stringify(message))
  }
}

