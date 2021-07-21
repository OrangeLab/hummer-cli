import * as WebSocket from 'ws'
import { EventEmitter } from 'events'
import type { Server as HttpServer, IncomingMessage } from 'http'
import type { AddressInfo } from 'net'
import { Native } from './Native'
const { getHost } = require('./utils')
const Url = require('url')

const WS_NATIVE_URL = '/proxy/native';
const WS_CLIENT_URL = '/proxy/client';
const INTERNAL_ERROR_CODE = 1011;

export class ProxyServer {
    private _serverAddressWithPort:String = ''
    private _nativeEmit:EventEmitter = new EventEmitter()
    private _natives:Map<number, Native> = new Map()
    private _nativeCount:number = 0
    private _clientSocket?:WebSocket

    constructor() {
        this._addNativeEmitListener()
    }

    addWebSocketListener(server:HttpServer) {
        
        const { port } = server.address() as AddressInfo
        this._serverAddressWithPort = `${getHost()}:${port}`;
        this._addConnectionHandler(server)
    }
    // @ts-ignore

    _addConnectionHandler(server:HttpServer) {
        const nativeWss = new WebSocket.Server({ noServer: true })
        const clientWss = new WebSocket.Server({ noServer: true })
        console.warn(`web socket server listening, native can connect ws server by ws://${this._serverAddressWithPort}${WS_NATIVE_URL} ...`)
        console.warn(`web socket server listening, client can connect ws server by ws://${this._serverAddressWithPort}${WS_CLIENT_URL} ...`)
        nativeWss.on('connection', (socket, request) => {
            console.log('nativeWss connection')
            // @ts-ignore
            this._handleNativeConnection(socket, request, nativeWss)
        })
        clientWss.on('connection', (socket, request) => {
            console.log('clientWss connection')
            // @ts-ignore
            this._handleClientConnection(socket, request, clientWss)
        })
        server.on('upgrade', (request, socket, head) => {
            const { pathname } = Url.parse(request.url)
            if (pathname === WS_NATIVE_URL) {
                nativeWss.handleUpgrade(request, socket, head, (ws) => {
                    nativeWss.emit('connection', ws, request)
                })
            } else if (pathname === WS_CLIENT_URL) {
                clientWss.handleUpgrade(request, socket, head, (ws) => {
                    clientWss.emit('connection', ws, request)
                })
            } else {
                socket.destroy()
            }
        })
    }
    // @ts-ignore
    _handleNativeConnection(socket:WebSocket, request:IncomingMessage, nativeWss:WebSocket.Server) {
        try {
            // 记录 native 端
            const nativeId = this._nativeCount++
            this._natives.set(
                nativeId,
                new Native(nativeId, '', socket, this._nativeEmit)
            )
            socket.on('close', (msg) => {
                console.log(msg)
                this._natives.delete(nativeId)
            })
        } catch (error) {
            console.error('error', error);
            socket.close(INTERNAL_ERROR_CODE, error);
        }
    }
    // @ts-ignore
    _handleClientConnection(socket:WebSocket, request:IncomingMessage, clientWss:WebSocket.Server) {
         try {
            this._clientSocket = socket
            socket.on('message', (message) => {
                console.log('client msg', message)
                this._handleClientMeaasge(message)
            })
            socket.on('close', () => {
                this._clientSocket = undefined
            })
        } catch (error) {
            console.error(error);
            socket.close(INTERNAL_ERROR_CODE, error);
        }
    }

    _handleClientMeaasge(message:any) {
        try {
            message = JSON.parse(message)
        } catch (error) {
        }
        const isLegal = this._validateMessage(message, 'client')
        if (isLegal) {
            this.pushMessageToNatives(message)
        } else {
            // Todo: 约定 msg 无效的情况
            this._pushMessageToClient(message)
        }
    }
    
    pushMessageToNatives(message:any) {
        Array.from(this._natives.entries()).forEach(
            ([nativeId, native]) => {
                console.log('nativeId', nativeId)
                native.sendMessageToNative(message)
            }
        )
    }

    _addNativeEmitListener() {
        this._nativeEmit.on('native', (message, nativeInfo) => {
            // console.log('_addNativeEmitListener recevie msg', message, nativeInfo)
            this._handleNativeMeaasge(message, nativeInfo)
        })
    }

    _handleNativeMeaasge(message:any, nativeInfo:any) {
        const isLegal = this._validateMessage(message, 'native')
        if (isLegal) {
            this._pushMessageToClient(message, nativeInfo)
        } else {
            // Todo: 通知 native 不符合协议
            // this.pushMessageToNatives(message)
        }
    }
    _validateMessage(message:any, channel:string) {
        let flag = true
        // Todo: 定义通信协议
        if (Object.prototype.toString.call(message).slice(8, -1) === 'Object') {
            ['type', 'method', 'params', 'protocol-version'].forEach(key => {
                flag = flag && Object.prototype.hasOwnProperty.call(message, key)
            })
        }
        if (channel === 'native') {
        } else if(channel === 'client') {
        }
        return flag
    }

    // @ts-ignore
    _pushMessageToClient(message:any, nativeInfo?:any) {
        // if (message.type == 'Page') {
        // } else if (message.type == 'Log') {
        // } else if (message.type == 'Other') {
        // } else {
        // }
        this._clientSocket && this._clientSocket.send(JSON.stringify(message))
    }
}

