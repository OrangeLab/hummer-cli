import {mergeWithCustomize,customizeArray, CustomizeRule} from 'webpack-merge'
import * as glob from 'glob'
import * as path from 'path'
import {ProjectType} from '@hummer/cli-utils'
import {getEntryConfig} from './index'

const defaultFileReg = /\/([\w-]+)\.[j|t]s/

export function mergeConfig(source:any, target:any):any{
  let config = mergeWithCustomize({
    customizeArray: customizeArray({
      'resolve.extensions': CustomizeRule.Prepend // extensions use prepend strategy
    }),
  })(source, target)
  return config
}

export function getEntries(entrySource:string, type?:ProjectType){
  let entries:Record<string, string> = {}
  let root = process.cwd()
  glob.sync(entrySource).forEach(item => {
    let pageName = getPageName(item, type)
    if (pageName) {
      entries[pageName] = path.join(root, item)
    }
  })
  return entries
}

/**
 * Get Page Name
 * Ex. src/index/entry.js => index
 * Ex. src/order/index.ts => order
 * Ex. src/order.js => order
 */
function getPageName(filePath:string, type?:ProjectType){
  let matchReg = getEntryConfig(type)
  let matches = filePath.match(matchReg)
  if(!matches){
    let customMatches = filePath.match(defaultFileReg)
    return customMatches && customMatches[1]
  }else{
    return matches  && matches[1]
  }
}