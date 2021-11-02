import * as http from 'http'
import { IncomingMessage, ServerResponse } from 'http'
import * as portfinder from 'portfinder';
import { DEBUG_SERVER_CHECK_JSON_URL } from './InspectorProxy';

const needle = require('needle');

export class DebugServer {

  public port: number;
  constructor(public globalServerPort: number, public devPort: number, public root: string) { }

  public async createServer() {
    const httpServer = http.createServer(this.processRequest.bind(this))
    this.port = await portfinder.getPortPromise({ port: 34649 });
    httpServer.listen(this.port, '');
  }

  public start(): Promise<void> {

    return new Promise<void>(async (resolve, reject) => {

      needle('post', `http://localhost:${this.globalServerPort}/debug/start`, { devPort: this.devPort, debugPort: this.port, workspaceFolder: this.root }, { json: true })
        .then((resp: any) => {
          resolve();
        }).catch((e: any) => {
          reject(e);
        });

    })
  }

  private processRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    if (request.url === DEBUG_SERVER_CHECK_JSON_URL) {
      this._sendJsonResponse(response, { isDebugging: true });
    }
  }


  private _sendJsonResponse(
    response: ServerResponse,
    object: any,
  ) {
    const data = JSON.stringify(object, null, 2);
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache',
      'Content-Length': data.length.toString(),
      Connection: 'close',
    });
    response.end(data);
  }

}