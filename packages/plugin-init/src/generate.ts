import * as Metalsmith from 'metalsmith'
import * as Handlebars from 'handlebars'
import {handlebars} from 'consolidate'
import * as libPath from 'path'
import * as async from 'async'
import {getLoggerWithTag, chalk} from '@hummer/cli-utils'
import {getTplOpts} from './uitls'
import {ask} from './ask'
const logger = getLoggerWithTag('sls-cli-plugin-init')

export const generate = function (name: string, src: string, dest: string, done: (err: Error) => void): void {
  const opts = getTplOpts(name, src)
  const metalsmith = Metalsmith(libPath.join(src, 'template'))
  const data = Object.assign(metalsmith.metadata(), {
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true
  })
  opts.helpers && Object.keys(opts.helpers).map(key => {
    Handlebars.registerHelper(key, opts.helpers[key])
  })

  metalsmith
    .use(askQuestions(opts.prompts))
    .use(renderTemplate())

  metalsmith.clean(false)
    .source('.')
    .destination(dest)
    .build((err: any, files: any) => {
      done(err)
      if (typeof opts.complete === 'function') {
        const helpers = {chalk, files}
        opts.complete(data, helpers)
      } else {
        logMessage(opts.completeMessage, data)
      }
    })
}

function askQuestions(prompts: any) {
  return (files: any, metalsmith: any, done: any) => {
    ask(prompts, metalsmith.metadata(), done)
  }
}

function logMessage(message: any, data: any) {
  if (!message) return
  handlebars.render(message, data, (err: Error, res: string) => {
    if (err) {
      logger.error('Error when rendering template complete message: ' + err.message.trim())
    } else {
      logger.done(res)
    }
  })
}

function renderTemplate() {
  return (files: Metalsmith.Files, metalsmith: Metalsmith, done: any) => {
    const keys = Object.keys(files)
    const metalsmithMetadata = metalsmith.metadata()
    async.each(keys, (file: string, next: Function) => {
      const str = files[file].contents.toString()
      // vue 语法与模板语法一样，vue 文件不编译
      if (!/{{([^{}]+)}}/g.test(str) || /\.vue$/.test(file)) {
        return next()
      }
      handlebars.render(str, metalsmithMetadata, (err: Error, res: string) => {
        if (err) {
          err.message = `[${file}] ${err.message}`
          return next(err)
        }
        files[file].contents = new Buffer(res)
        next()
      })
    }, done)
  }
}

Handlebars.registerHelper('if_eq', function (a: string, b: string, opts: {inverse: Function, fn: Function}) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this)
})

Handlebars.registerHelper('unless_eq', function (a: string, b: string,  opts: {inverse: Function, fn: Function}) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this)
})
