import * as fs from 'fs'
import path from 'path'
import { Context, Next } from 'koa'

// 针对dist目录为多层级的情况，需要读取所有文件
export function readFileList(staticDir: string, filesList: string[] = []) {
  const files = fs.readdirSync(staticDir);
  files.forEach(item => {
    var fullPath = path.join(staticDir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      readFileList(path.join(staticDir, item), filesList);
    } else {
      filesList.push(fullPath);
    }
  });
  return filesList;
}

export function handleFileMiddleware(staticDir: string) {
  return (ctx: Context, next: Next) => {
    let { req } = ctx;
    if (req.url === '/fileList') {
      let fileList: string[] = [];
      readFileList(staticDir, fileList);
      fileList = fileList.filter((file) =>
        /\.js$/.test(file)
      ).map(file =>
        file.split(`${staticDir}${path.sep}`)[1]
      )
      ctx.body = {
        code: 0,
        data: fileList
      };
    } else {
      next();
    }
  }
}

export function handleIndexMiddleware() {
  return (ctx: Context, next: Next) => {
    let { req } = ctx;
    if (req.url === '/' || req.url === '/index.html') {
      // TODO 替换精美的首页
      ctx.html("index.html")
    } else {
      next();
    }
  }
}


export function handleWebServerPortMiddleware(WebServer: any) {
  return (ctx: Context, next: Next) => {
    let { req } = ctx;
    if (req.url === '/webServerPort') {
      ctx.body = {
        code: 0,
        data: WebServer.WebServerPort
      };
    } else {
      next();
    }
  }
}

export function getServerFileList(staticDir: string, serverLocation: string) {
  let fileList: string[] = [];
  readFileList(staticDir, fileList);
  fileList = fileList.filter((file) =>
    /\.js$/.test(file)
  ).map(file => {
    let newFile
    newFile = `${serverLocation}${file.split(`${staticDir}${path.sep}`)[1]}`
    return newFile
  })
  return fileList
}