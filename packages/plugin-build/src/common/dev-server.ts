// import * as WebSocket from 'ws'
import * as http from 'http'
import Koa from 'koa'
import serve from 'koa-static'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { handleFileMiddleware, handleIndexMiddleware, handleWebServerPortMiddleware, getServerFileList } from './middleware'
import { ProxyServer } from '@hummer/cli-proxy-server'
import { IDevTool } from '@hummer/cli-utils'
const htmlRender = require("koa-html-render")

const open = require('open')
const path = require('path');
const fs = require('fs')
const qrcode = require('qrcode-terminal')
export class DevServer extends EventEmitter {

  private server!: Server
  private proxyServer!: ProxyServer

  constructor(public host: string, public port: number, public staticDir: string, public WebServer: any, public devTool: IDevTool) {
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
    app.use(handleWebServerPortMiddleware(this.WebServer))

    this.proxyServer = new ProxyServer()
    this.server.listen({ port: this.port }, () => {
      console.warn(`Web http server listening , you can connect http server by http://${this.host}:${this.port}/ ...`);
      this.proxyServer.addWebSocketListener(this.server)
      if (this.devTool.web) {
        open(`http://${this.host}:${this.port}/`)
      } else {
        let serverFileList = getServerFileList(this.staticDir, `http://${this.host}:${this.port}/`)
        if (this.devTool.qrCode) {
          serverFileList.forEach((item) => {
            console.log(`${item}:`)
            qrcode.generate(item, { small: true });
          })
        } else {
          console.log(serverFileList)
        }
      }
    })
  }

  send(msg: any) {
    // @ts-ignore
    this.proxyServer.pushMsgToNative(msg)
  }

  stop() {
    this.server && this.server.close()
  }

}