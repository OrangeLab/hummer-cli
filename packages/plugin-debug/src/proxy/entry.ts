import * as http from 'http'
import { InspectorProxy } from './InspectorProxy'
const {parse} = require('url');

function runGlobalInspectorProxy(port:number) {
  const inspectorProxy = new InspectorProxy();
  const httpServer = http.createServer(inspectorProxy.processRequest.bind(inspectorProxy))

  httpServer.listen(port, '', () => {
    process.send("success");
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
const port = process.argv[2];
const root = process.cwd()
runGlobalInspectorProxy(parseInt(port));
