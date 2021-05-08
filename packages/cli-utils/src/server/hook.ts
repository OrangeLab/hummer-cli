import { warn } from '../logger'
import { Plugin } from './plugin'
import {isFunction} from '../utils'

export enum Hooks {
  HttpServerStart = 'onHttpServerStart',
  HttpServerClose = 'onHttpServerClose',
  WsServerStart = 'onWsServerStart',
  WsServerConnect = 'onWsServerConnect',
  WsServerClose = 'onWsServerClose',
  WsServerMessage = 'onWsServerMessage',
}

export const HookPlugins: Record<string, Array<Plugin>> = {
  [Hooks.HttpServerStart]: [],
  [Hooks.HttpServerClose]: [],
  [Hooks.WsServerStart]: [],
  [Hooks.WsServerConnect]: [],
  [Hooks.WsServerClose]: [],
  [Hooks.WsServerMessage]: []
}
export function injectHookPlugin(plugin:any){
  Object.keys(HookPlugins).forEach((key:string) => {
    if(plugin[key] && isFunction(plugin[key])){
      HookPlugins[key].push(plugin)
    }
  })
}

export function invokeHook(type:Hooks, ...args:any){
  HookPlugins[type].forEach((plugin) => {
    if(typeof plugin[type] === "function"){
      (plugin[type] as Function).apply(plugin, args)
    }else{
      warn("错误的中间件")
    }
  })
}