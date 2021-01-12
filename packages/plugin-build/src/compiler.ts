import webpack from 'webpack'
import {Stats} from 'webpack'
import {WsServer} from './common/ws-server'
import {getPort, getHost} from './utils'
import * as fs from 'fs'
import {fse} from '@hummer/cli-utils'
export class Compiler{
  config: any
  initConfig(config:any){
    this.config = config
  }
  
  build(){
    return new Promise<void>((resolve, reject) => {
      // TODO build增加压缩
      webpack({
        ...this.config,
        mode: 'production'
      }, (err:any, stats:any) => {
        if (err) {
          reject(err);
        }
        this.printStats(stats)
        resolve();
      });
    })
  }

  async dev(){
    // 启动Dev Server And Websocket Server
    let rootDir = this.config?.output?.path;
    fse.ensureDirSync(rootDir);
    let port = await getPort();
    let host = getHost();
    var ws = new WsServer(host, port, rootDir);
    ws.start();
    this.startWatchServer({host, port, rootDir}, ws);

    this.buildWatch((stats:Stats) => {
      this.printStats(stats);
    })
  }

  buildWatch(callback:Function){
    return new Promise<void>((resolve, reject) => {
      let compiler = webpack({
        ...this.config,
        mode: 'development'
      });
      compiler.watch({}, (err, result) => {
        if (err) {
          reject(err);
        }
        this.printStats(result);
        callback && callback(result);
      })
      resolve();
    })
  }

  printStats(stats?:Stats){
    process.stdout.write(
      stats?.toString({
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false
      }) + '\n\n'
    )
    // let output =  stats?.toString({
    //   colors: true,
    //   modules: false,
    //   children: false,
    //   chunks: false,
    //   chunkModules: false,
    //   entrypoints: false
    // })
    // console.log(output)
  }

  startWatchServer({host, port, rootDir}:any, ws:any){
    fs.watch(rootDir, {recursive: true}, (_event, fileName) => {
      if(!/\.js$/.test(fileName)){
        return
      }
      let message = {
        type: 'ReloadBundle',
        params: {
          url: `http://${host}:${port}/${fileName}`
        }
      }
      ws.send(JSON.stringify(message))
    })
  }
}

