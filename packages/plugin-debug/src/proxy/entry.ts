import * as http from 'http'
import { InspectorProxy } from './InspectorProxy'
const {parse} = require('url');

export default function runInspectorProxy(port:number, projectRoot:string) {
  const inspectorProxy = new InspectorProxy(projectRoot);
  const httpServer = http.createServer(inspectorProxy.processRequest.bind(inspectorProxy))
  httpServer.listen(port, '127.0.0.1', () => {
    const websocketEndpoints = inspectorProxy.addWebSocketListener(
      httpServer,
    );
    httpServer.on('upgrade', (request, socket, head) => {
      const {pathname} = parse(request.url);
      if (pathname != null && websocketEndpoints[pathname]) {
        websocketEndpoints[pathname].handleUpgrade(
          request,
          socket,
          head,
          (ws: any) => {
            websocketEndpoints[pathname].emit('connection', ws, request);
          },
        );
      } else {
        socket.destroy();
      }
    });
  });   
}