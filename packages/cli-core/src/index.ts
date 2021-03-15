import {getDebug, info, cliConfig} from '@hummer/cli-utils'

import * as minimist from 'minimist'
import {Core} from './core'

export class CoreCli {
  private cliConfig:any = {};
  private hooks:Record<string, string> = {};
  private argv:any;
  protected core: Core;
  public commandsArray: string[];
  constructor(argv: Array<string>){
    this.cliConfig = cliConfig;
    this.argv = minimist(argv.slice(2));
    this.commandsArray = [].concat(this.argv._);
    this.argv.command = this.commandsArray.join(' ')
    this.core = new Core(this.argv)
    this.hooks = {

    }
    console.log('ARGV ====>')
    console.log(this.argv)
    console.log(this.commandsArray);
  }
  /**
   * 初始化Cli
   */
  async init(){
    this.loadDefaultPlugins()
    await this.loadServicePlugins()
  }

  /**
   * 执行命令
   */
  async run(){
    if(this.argv.v || this.argv.V || this.argv.version){
      info(`current running hummer cli (${this.cliConfig.root})`)
      info(`${this.cliConfig.name}@${this.cliConfig.version}`)
      return;
    }
    this.core.invoke(this.commandsArray)
  }

  /**
   * 加载默认的插件,子类自行实现
   */
  protected loadDefaultPlugins(){}

  /**
   * 加载工程内的插件
   */
  async loadServicePlugins(){
    
  }

}

export * from './core';
export * from './plugin';