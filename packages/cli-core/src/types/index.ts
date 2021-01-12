export interface ICommand {
  description?: string
  pluginName?: string
  usage?: string
  options?: {
    [option: string]: string
  }
  commands?: {
    [command: string]: ICommand
  },
  hooks?:Array<Function>
}

export interface IPluginCommands {
  [command: string]: ICommand
}

export interface ICoreCommands {
  [command: string]: ICoreCommand
}
export interface ICoreCommand extends ICommand {
  key: string
  pluginName: string
}