
import * as WebSocket from 'ws'
import { EventEmitter } from 'events'

export class Tenon {
  private id: Number = 0;
  private name: String = '';
  private _nativeSocket: WebSocket
  private _emit: EventEmitter
  // private _pages:Array = []

  constructor(id: Number, name: String, socket: WebSocket, emit: EventEmitter) {
    this.id = id
    this.name = name || 'Unknown'
    this._nativeSocket = socket
    this._emit = emit
    // this._pages = [] // Tip: 页面管理
    this._addSocketHandler()
  }

  _addSocketHandler() {
    this._nativeSocket.on('message', (message: any) => {
      try {
        message = JSON.parse(message);
        this._emit.emit('tenon', message, {
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
      this._nativeSocket.send(JSON.stringify(message))
    } catch (error) {
      console.log('_sendMessageToNative error', error)
    }
  }
}