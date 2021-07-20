'use strict';
const WebSocket = require('ws')
const { EventEmitter } = require('events')
const Native = require('./Native')
const { getHost } = require('./utils')
const Url = require('url');

const WS_NATIVE_URL = '/proxy/native';
const WS_CLIENT_URL = '/proxy/client';
const INTERNAL_ERROR_CODE = 1011;

class ProxyServer {

    constructor() {
        this._serverAddressWithPort = ''
        this._nativeWss = null
        this._clientWss = null
        this._nativeEmit = new EventEmitter()
        this._natives = new Map()
        this._clientSocket = null
        this._nativeCount = 0
        this._addNativeEmitListener()
    }

    addWebSocketListener(server) {
        const { port } = server.address()
        this._serverAddressWithPort = `${getHost()}:${port}`;
        this._addConnectionHandler(server)
    }

    _addConnectionHandler(server) {
        const nativeWss = new WebSocket.Server({ noServer: true })
        const clientWss = new WebSocket.Server({ noServer: true })
        console.warn(`web socket server listening, native can connect ws server by ws://${this._serverAddressWithPort}${WS_NATIVE_URL} ...`)
        console.warn(`web socket server listening, client can connect ws server by ws://${this._serverAddressWithPort}${WS_CLIENT_URL} ...`)
        nativeWss.on('connection', (socket, request) => {
            console.log('nativeWss connection')
            this._handleNativeConnection(socket, request, nativeWss)
        })
        clientWss.on('connection', (socket, request) => {
            console.log('clientWss connection')
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

    _handleNativeConnection(socket, request, nativeWss) {
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
            console.error('error', e);
            socket.close(INTERNAL_ERROR_CODE, e);
        }
    }

    _handleClientConnection(socket, request, clientWss) {
         try {
            this._clientSocket = socket
            socket.on('message', (message) => {
                console.log('client msg', message)
                this._handleClientMeaasge(message)
            })
            socket.on('close', () => {
                this._clientSocket = null
            })
        } catch (error) {
            console.error(e);
            socket.close(INTERNAL_ERROR_CODE, e);
        }
    }

    _handleClientMeaasge(message) {
        try {
            message = JSON.parse(message)
        } catch (error) {
        }
        const isLegal = this._validateMessage(message, 'client')
        if (isLegal) {
            this.pushMessageToNatives()
        } else {
            // Todo: 约定 msg 无效的情况
            this._pushMessageToClient()
        }
    }
    
    pushMessageToNatives(message) {
        this._natives.entries().forEach((nativeId, native) => {
            native.sendMessageToNative(message)
        })
    }

    _addNativeEmitListener() {
        this._nativeEmit.on('native', (message, nativeInfo) => {
            // console.log('_addNativeEmitListener recevie msg', message, nativeInfo)
            this._handleNativeMeaasge(message, nativeInfo)
        })
    }

    _handleNativeMeaasge(message, nativeInfo) {
        const isLegal = this._validateMessage(message, 'native')
        if (isLegal) {
            this._pushMessageToClient(message, nativeInfo)
        } else {
            // Todo: 通知 native 不符合协议
            // this.pushMessageToNatives(message)
        }
    }
    _validateMessage(message, channel) {
        let flag = true
        if (Object.prototype.toString.call(message).slice(8, -1) === 'Object') {
            ['type', 'method', 'params', 'protocol-version'].forEach(key => {
                flag = flag && Object.prototype.hasOwnProperty.call(message, key)
            })
        }
        // if (channel === 'native') {
        // } else if(channel === 'client') {
        // }
        return flag
    }

    _pushMessageToClient(message, nativeInfo) {
        // if (message.type == 'Page') {
        // } else if (message.type == 'Log') {
        // } else if (message.type == 'Other') {
        // } else {
        // }
        this._clientSocket && this._clientSocket.send(JSON.stringify(message))
    }
}

module.exports = ProxyServer


