import {HttpServer, Middleware} from './http-server'
import {WsServer} from './ws-server'
import {Plugin} from './plugin'
import {Hooks, injectHookPlugin, invokeHook} from './hook'
import {isArray} from '../utils'
import {LogPlugin} from './log-plugin'
export const defaultPort = 80
export class Server{
  koaMiddlewares:Array<Middleware> =  []
  plugins:Array<Plugin> =  []
  httpServer: HttpServer
  wsServer: WsServer
  constructor(port:number){
    this.httpServer = new HttpServer(port)
    this.wsServer = new WsServer(this.httpServer)
    this.initEvent();
  }

  private initEvent(){
    // Http Server Start
    this.httpServer.on('start', () => {
      invokeHook(Hooks.HttpServerStart)
    })

    // Http Server Close
    this.httpServer.on('close', () => {
      invokeHook(Hooks.HttpServerClose)
    })

    // Websocket Server Start
    this.wsServer.on('start',() => {
      invokeHook(Hooks.WsServerStart)
    })
    // Websocket Server Connect
    this.wsServer.on('connection',() => {
      invokeHook(Hooks.WsServerConnect)
    })
    // Websocket Server Close
    this.wsServer.on('close',() => {
      invokeHook(Hooks.WsServerClose)
    })
    // Websocket Server Message
    this.wsServer.on('message',(msg:any) => {
      invokeHook(Hooks.WsServerMessage, msg)
    })
  }

  start(){
    this.httpServer.applyMiddleWares(this.koaMiddlewares)
    this.httpServer.start()
    this.wsServer.start()
  }

  stop(){
    this.httpServer.stop()
    this.wsServer.stop()
  }

  restart(){
    this.stop()
  }

  apply(plugin: Plugin|Array<Plugin>){
    if(isArray(plugin)){
      (plugin as Array<Plugin>).forEach((p:Plugin) => {
        this.plugins.push(p);
        injectHookPlugin(p);
      });
    }else{
      this.plugins.push(plugin as Plugin);
      injectHookPlugin(plugin);
    }
  }

  use(middleware:Middleware){
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

export function getServer(port:number = defaultPort){
  const server = new Server(port);
  server.apply(new LogPlugin())
  return server
}

export const server = getServer(defaultPort)
export * from './plugin'

export default server;
