import * as http from 'http'
import Koa,{Middleware as KoaMiddleware} from 'koa'
import { Server } from 'http'
import { EventEmitter } from 'events'

export type Middleware = KoaMiddleware
export class HttpServer extends EventEmitter {
  app: Koa
  server: Server
  constructor(private port: number) {
    super()
    this.port = port
    this.app = new Koa()
    this.server = http.createServer(this.app.callback())
  }

  applyMiddleWares(middlewares: Array<Middleware>){
    middlewares.forEach((middleware:Middleware) => {
      this.app.use(middleware)
    })
  }

  start() {
    try{
      this.server.listen({ port: this.port }, () => {
        this.emit('start')
      })
    }catch(err){
      console.log('Http Server Address Already in use')
    }

  }

  stop() {
    return new Promise((resolve, reject) => {
      if(!this.server){
        reject('Http Server 尚未开启')
        return
      }
      this.server.close((err) => {
        if(err){
          reject(err)
        }
        this.emit('close')
        resolve('HttpServerClose')
      })
    })

  }

}