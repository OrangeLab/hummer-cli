'use strict';
const ProxyServer = require('./ProxyServer');
// const Koa = require('koa')
const { getHost, getPort } = require('./utils');
const { createServer } = require('http');


function runProxyServer (port) {
    port = port || getPort()
    // const app = new Koa()
    // Todo: 使用 koa middleware 处理路由逻辑 是否需要 app.callback()
    const proxyServer = new ProxyServer()
    const httpServer = createServer()
    httpServer.listen({ port }, () => {
        console.log(`Web http server listening, you can connect http server by http://${getHost()}:${port}/ ...`)
        proxyServer.addWebSocketListener(httpServer)
    })
}

runProxyServer()
// module.exports = { proxyServer: runProxyServer }

