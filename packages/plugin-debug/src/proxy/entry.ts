import * as http from 'http'
import { InspectorProxy } from './InspectorProxy'

export default function runInspectorProxy(port:number, projectRoot:string) {
  const inspectorProxy = new InspectorProxy(projectRoot);
  const httpServer = http.createServer(inspectorProxy.processRequest.bind(inspectorProxy))
  httpServer.listen(port, '127.0.0.1', () => {
    inspectorProxy.addWebSocketListener(httpServer);
  });   
}