const debugOrigin = require('debug')
import * as inquirerOrigin from 'inquirer'
import * as fseOrigin from 'fs-extra'
import * as homeOrigin from 'user-home';

export const getDebug = debugOrigin

export * from './logger'
export * from './config'
export * from './server'

export const inquirer = inquirerOrigin
export const fse = fseOrigin
export const home = homeOrigin

export const cliConfig = {
  root: ''
}
export function initCliConfig(config:any){
  Object.assign(cliConfig, config);
}
