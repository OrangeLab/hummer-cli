'use strict';

class Native {
    constructor(id, name, socket, emit) {
        this.id = id
        this.name = name || 'Unknown'
        this._nativeSocket = socket
        this._emit = emit
        this._pages = [] // Tip: 页面管理
        this._addSocketHandler()
    }

    _addSocketHandler() {
        this._nativeSocket.on('message', (message) => {
            try {
                message = JSON.parse(message);
                this._emit.emit('native', message, {
                    id: this.id,
                    name: this.name
                })
            } catch (error) {
                console.log(error)
            }
        })
    }

    sendMessageToNative(message) {
        try {
            this._nativeSocket.send(JSON.stringify(message))
        } catch (error) {
            console.log('_sendMessageToNative error', error)
        }
    }
}

module.exports = Native