import {Hooks} from './hook'
export interface Plugin{
  name: string
  [Hooks.HttpServerStart]?:Function
  [Hooks.HttpServerClose]?:Function
  [Hooks.WsServerConnect]?:Function
  [Hooks.WsServerStart]?:Function
  [Hooks.WsServerClose]?:Function
  [Hooks.WsServerMessage]?:Function
}