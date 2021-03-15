import {Plugin} from './plugin'
import {ICoreCommands} from './types'
import {getDebug, error} from '@hummer/cli-utils'
const debug = getDebug("hummer-cli:core")

interface Command{
  key: string,
  usage: string,
  description: string,
  options: Record<string, string>
}
export class Core {
  private commands:ICoreCommands = {}
  private options:any
  private argv: any
  constructor(argv:any){
    this.argv = argv;
    this.options = argv;
  }

  invoke(commandsArray?: string[]){
    if(this.argv.h || this.argv.H || this.argv.help){
      this.handleHelp(commandsArray);
      return;
    }
    let command = this.getCommand(commandsArray)
    command.hooks && command.hooks.forEach(hook => {
      hook(this.argv)
    })
  }

  addPlugin(Plugin:any){
    // load command
    const plugin = new Plugin(this, this.options, Plugin.name);
    this.loadCommands(plugin)
  }

  private loadCommands(plugin: Plugin){
    Object.keys(plugin.commands).forEach(key => {
      let command = plugin.commands[key]
      Object.assign(this.commands, {
        [key]: {
          key: key,
          pluginName: plugin.name,
          ...command
        }
      })
    })
    debug(this.commands)
  }

  // 考虑子命令的场景
  private getCommand(commandsArray?:string[]){
    let command = commandsArray[0]
    if(!this.commands[command]){
      error('无效的命令，以下是帮助文档：');
      this.getTotalHelp();
      process.exit(0)
    }else{
      return this.commands[command]
    }
  }
  private handleHelp(commandsArray?:string[]){
    if(this.argv.command){
      this.getCommandHelp(commandsArray)
    }else {
      this.getTotalHelp();
    }
  }

  private getTotalHelp(){
    let help = `
      Usage: hummer [command] [options]

      Options:

        -v, --version     output the version number
        -h, --help        output usage information

      Commands:

    `
    Object.keys(this.commands).forEach(key => {
      let command = this.commands[key]
      help += `\t${command.usage}\t ${command.description}`
      help += '\n'
    })
    console.log(help)
  }

  private getCommandHelp(commandsArray?:string[]){
    let command = this.getCommand(commandsArray);
    let optionsHelp = ''
    if(command.options){
      optionsHelp = `
      Options:
      `
      Object.keys(command.options).forEach(key => {
        optionsHelp += `\t${key}: ${command.options[key]}\n`
      })
    }
    let help = `
      Usage: ${command.usage}
      ${optionsHelp}
    `
    console.log(help)
  }
}