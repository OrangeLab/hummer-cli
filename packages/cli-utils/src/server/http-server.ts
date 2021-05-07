import * as http from 'http'
import Koa from 'koa'
import { Server } from 'http'
import { EventEmitter } from 'events'

export class HttpServer extends EventEmitter {
  app: Server
  constructor(private port: number) {
    super()
    this.port = port
    const app = new Koa()
    this.app = http.createServer(app.callback())
  }

  start() {
    this.app.listen({ port: this.port }, () => {
      this.emit('start')
    })
  }

  stop() {
    this.app && this.app.close(() => {
      this.emit('close')
    })
  }

}