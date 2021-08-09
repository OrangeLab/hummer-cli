import { ProxyServer } from './ProxyServer';
const { getHost, getPort } = require('./utils');
const { createServer } = require('http');

function runProxyServer(port?: Number) {
  port = port || getPort()
  const proxyServer = new ProxyServer()
  const httpServer = createServer()
  httpServer.listen({ port }, () => {
    console.log(`Web http server listening, you can connect http server by http://${getHost()}:${port}/ ...`)
    proxyServer.addWebSocketListener(httpServer)
  })
}

export { ProxyServer, runProxyServer }

