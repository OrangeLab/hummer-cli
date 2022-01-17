import { mergeWithCustomize, customizeArray, CustomizeRule } from 'webpack-merge'
import * as glob from 'glob'
import * as path from 'path'
import { ProjectType } from '@hummer/cli-utils'
import { getEntryConfig } from './index'
import * as fs from 'fs'
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const template = require('art-template')
const defaultFileReg = /\/([\w-]+)\.[j|t]s/

export function mergeConfig(source: any, target: any): any {
  let config = mergeWithCustomize({
    customizeArray: customizeArray({
      'resolve.extensions': CustomizeRule.Prepend // extensions use prepend strategy
    }),
  })(source, target)
  return config
}

export function getEntries(entrySource: string, type?: ProjectType) {
  let entries: Record<string, string> = {}
  let root = process.cwd()
  glob.sync(entrySource).forEach(item => {
    let pageName = getPageName(item, type)
    if (pageName) {
      entries[pageName] = path.join(root, item)
    }
  })
  return entries
}

export function getPlugins(plugins: any,) {
  let rootPath: string, newPlugins: any = [], cssPath: string, jsPath: string, htmlstr: string,data:Buffer;
  try {
    fs.accessSync(path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist/index.html'));
    rootPath = path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist/index.html')
    cssPath = path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist/index-browser.css')
    jsPath = path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist/index-browser.js')
  } catch (err) {
    rootPath = path.join(__dirname, '../../../hummer-front/dist/index.html')
    cssPath = path.join(__dirname, '../../../hummer-front/dist/index-browser.css')
    jsPath = path.join(__dirname, '../../../hummer-front/dist/index-browser.js')
  }
  data = fs.readFileSync(rootPath);
  if (data) {
    htmlstr = template.render(data.toString(), {
      cssPath: './index-browser.css',
      jsPath: './index-browser.js',
      newInjectJsUrls: [],
    })
    newPlugins.push(
      new HtmlWebpackPlugin({
        templateContent: htmlstr,
        filename: 'index.html',
        hash: true,
        inject: false,
        minify: true,
      })
    )
  }
  newPlugins = [
    new CopyWebpackPlugin({
      patterns: [
        { from: jsPath },
        { from: cssPath }
      ],
    }),
    ...plugins,
    ...newPlugins
  ]
  return newPlugins
}

/**
 * Get Page Name
 * Ex. src/index/entry.js => index
 * Ex. src/order/index.ts => order
 * Ex. src/order.js => order
 */
function getPageName(filePath: string, type?: ProjectType) {
  let matchReg = getEntryConfig(type)
  let matches = filePath.match(matchReg)
  if (!matches) {
    let customMatches = filePath.match(defaultFileReg)
    return customMatches && customMatches[1]
  } else {
    return matches && matches[1]
  }
}