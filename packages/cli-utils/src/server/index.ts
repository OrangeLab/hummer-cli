import {HttpServer} from './http-server'
import {WsServer} from './ws-server'
import {getLoggerWithTag} from '../logger'
const logger = getLoggerWithTag('Server')
let server:Server

export class Server{
  koaMiddlewares:Array<Function> =  []
  httpServer: HttpServer
  wsServer: WsServer
  staticPath:string = ''
  constructor(staticDir: string = ''){
    this.staticPath = staticDir
    this.httpServer = new HttpServer(8080)
    this.wsServer = new WsServer(this.httpServer)
    this.initEvent();
  }

  private initEvent(){
    // Http Server Start
    this.httpServer.on('start', () => {
      this.onHttpServerStart()
    })

    // Http Server Close
    this.httpServer.on('close', () => {
      this.onHttpServerClose()
    })

    // Websocket Server Start
    this.wsServer.on('start',() => {
      this.onWsServerStart()
    })
    // Websocket Server Connect
    this.wsServer.on('connection',() => {
      this.onWsServerConnect()
    })
    // Websocket Server Close
    this.wsServer.on('close',() => {
      this.onWsServerClose()
    })
    // Websocket Server Message
    this.wsServer.on('message',(msg:any) => {
      this.onWsServerMessage(msg)
    })
  }

  private onHttpServerStart(){
    logger.info('Http Server Start!')
  }

  private onHttpServerClose(){
    logger.info('Http Server Close!')
  }

  private onWsServerStart(){
    logger.info('Ws Server Start!')
  }
  private onWsServerConnect(){
    logger.info('Ws Server Connect!')
  }
  private onWsServerClose(){
    logger.info('Ws Server Close!')
  }
  private onWsServerMessage(msg:string){
    logger.info('Ws Server Get Message!' + msg)
  }

  start(){
    this.httpServer.start()
    this.wsServer.start()
  }

  stop(){
    this.httpServer.stop()
    this.wsServer.stop()
  }

  restart(){

  }

  apply(){
    
  }

  use(middleware:Function){
    // Koa MiddleWare
    this.koaMiddlewares.push(middleware)
  }

  get config(){
    return {
      ip: '',
      port: ''
    }
  }
}

export function getServer(staticDir?: string):Server{
  if(server){
    return server
  }else{
    return server = new Server(staticDir)
  }
}