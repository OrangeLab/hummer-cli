import WebSocket,{Server as WebSocketServer} from 'ws'
import { EventEmitter } from 'events'
import { HttpServer } from './http-server'

export class WsServer extends EventEmitter {
  private server:HttpServer
  private wss?: WebSocket.Server
  private socketConns: WebSocket[]
  constructor(server: HttpServer) {
    super()
    this.server = server
    this.socketConns = []
  }

  start() {
    const wss = new WebSocketServer({ server: this.server.app })
    this.emit('start')
    wss.on('connection', (socket: WebSocket) => {
      console.warn('web socket connection ...')
      this.socketConns.push(socket)
      this.emit('connection')
      socket.on('message', (data: any) => {
        this.emit('message', data)
        console.warn('receive message from ws: ', data)
      })
      socket.on('close', () => {
        this.emit('close')
        console.warn('web socket disconnection ...')
        this.socketConns = this.socketConns.filter((_socket) => (_socket !== socket))
      })
    })
  }

  send(msg: any) {
    console.warn(`ws send msg to clients ${this.socketConns.length}`, msg)
    this.socketConns.forEach((socket: WebSocket) => {
      socket.send(msg)
    })
  }

  stop() {
    this.wss && this.wss.close()
    this.socketConns = []
  }

}