import {IPluginCommands} from './types'
import {Core} from './core'
import * as utils from "@hummer/cli-utils";

export class Plugin{
  name:string
  commands: IPluginCommands
  protected utils: any
  constructor(core:Core, options:any, name?: string){
    this.name = name
    this.utils = utils
  }
}

