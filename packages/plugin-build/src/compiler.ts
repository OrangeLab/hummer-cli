import webpack from 'webpack'
import { Stats } from 'webpack'
import { WsServer } from './common/ws-server'
import { getServerConfig,  getHost} from './utils'
import * as fs from 'fs'
import { fse } from '@hummer/cli-utils'
import path from 'path'
export class Compiler {
  config: any
  initConfig(config: any) {
    this.config = config
  }

  build() {
    const rootDir = this.config?.output?.path ?? path.join(process.cwd(), 'dist');
    fse.removeSync(rootDir);
    return new Promise<void>((resolve, reject) => {
      // TODO build增加压缩
      webpack({
        ...this.config,
        mode: 'production'
      }, (err: any, stats: any) => {
        if (err) {
          reject(err);
        }
        this.printStats(stats)
        resolve();
      });
    })
  }

  async dev() {
    // 启动Dev Server And Websocket Server
    // 默认 path.join(process.cwd(), 'dist')
    let rootDir = this.config?.output?.path ?? path.join(process.cwd(), 'dist');
    fse.ensureDirSync(rootDir);
    let {port, host} = await getServerConfig();
    var ws = new WsServer(host, port, rootDir);
    ws.start();
    this.startWatchServer({ host, port, rootDir }, ws);

    this.buildWatch((stats: Stats) => {
      this.printStats(stats);
    })
  }

  buildWatch(callback: Function) {
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

  printStats(stats?: Stats) {
    process.stdout.write(
      stats?.toString({
        errorDetails: true,
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

  startWatchServer({ port, rootDir }: any, ws: any) {
    fs.watch(rootDir, { recursive: true }, (_event, fileName) => {
      if (!/\.js$/.test(fileName)) {
        return
      }
      // #issue 24 Web Socket Send Message Use New IP
      let message = {
        type: 'ReloadBundle',
        params: {
          url: `http://${getHost()}:${port}/${fileName}`
        }
      }
      ws.send(JSON.stringify(message))
    })
  }
}

