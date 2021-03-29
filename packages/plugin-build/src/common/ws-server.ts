import * as WebSocket from 'ws'
import * as http from 'http'
import Koa from 'koa'
import serve from 'koa-static'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { handleFileMiddleware, handleIndexMiddleware } from './middleware'

const htmlRender = require("koa-html-render")

const open = require('open')
const path = require('path');
export class WsServer extends EventEmitter {

  private wss?: WebSocket.Server
  private socketConns: WebSocket[]
  private server?: Server

  constructor(public host: string, public port: number, public staticDir: string) {
    super()
    this.socketConns = []
  }

  start() {
    const app = new Koa()
    this.server = http.createServer(app.callback())
    const wss = new WebSocket.Server({ server: this.server })
    wss.on('connection', (socket: WebSocket) => {
      console.warn('web socket connection ...')
      this.socketConns.push(socket)
      this.emit('connection')
      socket.on('message', (data: any) => {
        console.warn('receive message from ws: ', data)
      })
      socket.on('close', () => {
        console.warn('web socket disconnection ...')
        this.socketConns = this.socketConns.filter((_socket) => (_socket !== socket))
      })
    })
    app.use(serve(this.staticDir));
    app.use(serve(path.resolve(__dirname, '../../preview')));
    app.use(htmlRender('preview'))
    app.use(handleFileMiddleware(this.staticDir));
    app.use(handleIndexMiddleware());
    this.server.listen({ port: this.port }, () => {
      console.warn(`Web http server listening , you can connect http server by http://${this.host}:${this.port}/ ...`)
      console.warn(`web socket server listening , you can connect ws server by ws://${this.host}:${this.port}/ ...`)
      open(`http://${this.host}:${this.port}/`)
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
    this.server && this.server.close()
    this.socketConns = []
  }

}