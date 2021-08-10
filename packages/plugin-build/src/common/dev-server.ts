// import * as WebSocket from 'ws'
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
const fs = require('fs')
export class DevServer extends EventEmitter {

  private server!: Server
  private proxyServer!: ProxyServer

  constructor(public host: string, public port: number, public staticDir: string) {
    super()
    this.start()
  }

  start() {
    const app = new Koa()
    this.server = http.createServer(app.callback())

    app.use(serve(this.staticDir));
    try {
      fs.accessSync(path.resolve(__dirname, '../../node_modules/@hummer/devtools-frontend/dist'));
      app.use(serve(path.resolve(__dirname, '../../node_modules/@hummer/devtools-frontend/dist')));
    } catch (err) {
      app.use(serve(path.resolve(__dirname, '../../../devtools-frontend/dist')));
    }

    app.use(htmlRender('preview'));
    app.use(handleFileMiddleware(this.staticDir));
    app.use(handleIndexMiddleware());
    
    this.proxyServer = new ProxyServer()
    this.server.listen({ port: this.port }, () => {
      console.warn(`Web http server listening , you can connect http server by http://${this.host}:${this.port}/ ...`);
      this.proxyServer.addWebSocketListener(this.server)
      open(`http://${this.host}:${this.port}/`)
    })
  }

  send(msg: any) {
    // @ts-ignore
    this.proxyServer.pushMsgToTenons(msg)
  }

  stop() {
    this.server && this.server.close()
  }

}