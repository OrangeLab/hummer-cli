
import * as WebSocket from 'ws'
import { EventEmitter } from 'events'

export class Tenon {
  private id: Number = 0;
  private name: String = '';
  private _tenonSocket: WebSocket
  private _emit: EventEmitter
  public ip: String | undefined
  // private _pages:Array = []

  constructor(id: Number, name: String, socket: WebSocket, emit: EventEmitter, ip:String | undefined) {
    this.id = id
    this.name = name || 'Unknown'
    this._tenonSocket = socket
    this._emit = emit
    this.ip = ip
    // this._pages = [] // Tip: 页面管理
    this._addSocketHandler()
  }

  _addSocketHandler() {
    this._tenonSocket.on('message', (message: any) => {
      try {
        message = JSON.parse(message);
        this._emit.emit('message', message, {
          id: this.id,
          name: this.name
        })
      } catch (error) {
        console.log(error)
      }
    })
  }

  sendMsgToTenon(message: any) {
    try {
      this._tenonSocket.send(JSON.stringify(message))
    } catch (error) {
      console.log('_sendMessageToNative error', error)
    }
  }
}