import * as fs from 'fs'
import { Context, Next } from 'koa'

export function handleFileMiddleware(staticDir: string) {
  return (ctx: Context, next: Next) => {
    let { req } = ctx;
    if (req.url === '/fileList') {
      let files = fs.readdirSync(staticDir);
      files = files.filter((file) => {
        return /\.js$/.test(file)
      })
      ctx.body = {
        code: 0,
        data: files
      }
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