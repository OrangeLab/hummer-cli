import * as WebSocket from 'ws'
import * as http from 'http'
import Koa from 'koa'
import serve from 'koa-static'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { handleFileMiddleware, handleIndexMiddleware } from './middleware'
import { ProxyServer } from '@hummer/cli-proxy-server'


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
    console.log('ProxyServer', new ProxyServer())
    // 静态资源http服务
    const app = new Koa()
    this.server = http.createServer(app.callback())
    app.use(serve(this.staticDir));
    app.use(serve(path.resolve(__dirname, '../../node_modules/@hummer/devtools-frontend/dist')));
    app.use(htmlRender('preview'));
    app.use(handleFileMiddleware(this.staticDir));
    app.use(handleIndexMiddleware());

    // socket服务 使用proxy-server
    let proxyServer = new ProxyServer()
    this.server.listen({ port: this.port }, () => {
      console.warn(`Web http server listening , you can connect http server by http://${this.host}:${this.port}/ ...`)
      console.warn(`web socket server listening , you can connect ws server by ws://${this.host}:${this.port}/ ...`)
      open(`http://${this.host}:${this.port}/`)
      proxyServer.addWebSocketListener( this.server)
    })
  }

  send(msg: any) {
    console.warn(`ws send msg to clients ${this.socketConns.length}`, msg)
    // this.socketConns.forEach((socket: WebSocket) => {
    //   socket.send(msg)
    // })
  }

  stop() {
    this.wss && this.wss.close()
    this.server && this.server.close()
    this.socketConns = []
  }

}