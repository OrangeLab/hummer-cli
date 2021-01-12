import { createServer, Options } from 'http-server'
import * as http from 'http'

export class HttpServer {

  private server?: http.Server

  constructor (public host: string, public port: number, public rootDir: string, public options?: Options) {
    this.options = this.options || {}
  }

  start () {
    this.server = createServer({root: this.rootDir, ...this.options})
    this.server.listen(this.port)
    console.warn(`Web http server listening , you can connect http server by http://${this.host}:${this.port}/ ...`)
  }

  stop () {
    if (this.server) {
      this.server.close()
      this.server = undefined
    }
  }

}