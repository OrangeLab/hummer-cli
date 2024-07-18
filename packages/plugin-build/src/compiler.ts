import webpack from 'webpack'
import { Stats } from 'webpack'
import { DevServer } from './common/dev-server'
import { WebServer } from './common/web-server'
import { getServerConfig, getHost } from './utils'
import { getServerFileList } from './common/middleware'
import { fse, IDevTool } from '@hummer/cli-utils'
import path from 'path'
const watch = require("node-watch");
const qrcode = require('qrcode-terminal')
export class Compiler {
  webpackConfig: any
  webConfig: any
  buildOptions: any
  private devTool: IDevTool = {}
  initConfig(config: any) {
    this.webpackConfig = config.webpackConfig
    this.webConfig = config.webConfig
    this.devTool = {
      web: true,
      qrCode: false,
      enableServer: true,
      ...(config.devTool || {})
    }
    this.buildOptions = {
      cleanDist: true,
      ...(config.buildOptions || {})
    }
  }

  build() {
    const rootDir = this.webpackConfig?.output?.path ?? path.join(process.cwd(), 'dist');
    // build默认移除dist目录逻辑
    if (this.buildOptions.cleanDist) {
      fse.removeSync(rootDir);
    }
    return new Promise<void>((resolve, reject) => {
      // TODO build增加压缩
      webpack({
        ...this.webpackConfig,
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
    // 启动 DevServer，其中包含http & websocket
    // 默认 path.join(process.cwd(), 'dist')
    let rootDir = this.webpackConfig?.output?.path ?? path.join(process.cwd(), 'dist');
    fse.ensureDirSync(rootDir);
    let { port, host } = await getServerConfig();
    // 优先使用项目配置中的端口
    port = this.devTool.devServerPort || port;
    // TODO: openWeb确定openWeb配置 作用
    if (this.webConfig?.openWeb === 'all') {
      if (this.devTool?.enableServer) {
        // web模拟器 服务
        var webServer = new WebServer(host, port, rootDir, this.devTool);
        // 调试服务
        var devServer = new DevServer(host, port, rootDir, webServer, this.devTool);
        this.startWatchServer({ host, port, rootDir }, devServer);
      }

      this.buildWatch((stats: Stats) => {
        this.printStats(stats);
      })
    }
  }

  buildWatch(callback: Function) {
    return new Promise<void>((resolve, reject) => {
      let compiler = webpack({
        ...this.webpackConfig,
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
  }

  startWatchServer({ host, port, rootDir }: any, devServer: any) {
    let watcher = watch(rootDir, { recursive: true });
    watcher.on("change", (_event: any, fileName: any) => {
      if (!/\.js$/.test(fileName)) {
        return
      }
      if (!this.devTool.web) {
        let serverFileList = getServerFileList(rootDir, `http://${host}:${port}/`)
        if (this.devTool.qrCode) {
          serverFileList.forEach((item) => {
            console.log(`${item}:`)
            qrcode.generate(item, { small: true });
          })
        }else{
          console.log(serverFileList)
        }
      }
      fileName = fileName.split('/')[fileName.split('/').length - 1]
      let message = {
        type: 'ReloadBundle',
        params: {
          url: `http://${getHost()}:${port}/${fileName}`
        }
      }
      devServer.send(message)
    });
  }
}

