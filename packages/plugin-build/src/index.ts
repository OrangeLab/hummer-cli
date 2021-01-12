import { Core, Plugin } from '@hummer/cli-core'
import { getProjectConfig } from '@hummer/cli-utils'
import { getDefaultConfig } from './utils'
import { mergeConfig, getEntries } from './utils/webpack'
import { Compiler } from './compiler'
import { error } from '@hummer/cli-utils'

export class BuildPlugin extends Plugin {

  name = 'build'

  constructor(core: Core, options: any, name?: string) {
    super(core, options, name)
    this.commands = {
      build: {
        description: 'build project',
        usage: 'hummer build --[option]=[value]',
        hooks: [this.build.bind(this)]
      },
      dev: {
        description: 'build project and watch project change',
        usage: 'hummer dev --[option]=[value]',
        hooks: [this.dev.bind(this)]
      }
    }
  }

  private async build() {
    let config = await this.getWebpackConfig(true);
    let compiler = new Compiler();
    compiler.initConfig(config);
    compiler.build();
  }

  private async dev() {
    let config = await this.getWebpackConfig(false);
    let compiler = new Compiler();
    compiler.initConfig(config);
    compiler.dev();
  }

  private async getWebpackConfig(isProduction: boolean) {
    // 1. Read Project Config
    let projectConfig = await getProjectConfig();
    if (!projectConfig) {
      error('hm.config.js 文件不存在')
      process.exit();
    }
    let { type, webpack } = projectConfig
    let defaultConfig = getDefaultConfig(isProduction, type)
    if (webpack) {
      if (webpack.entries) {
        let entry = getEntries(webpack.entries, type)
        webpack.entry = entry
        delete webpack.entries
      }
      let config = mergeConfig(defaultConfig, webpack)

      return config
    } else {
      return defaultConfig
    }
  }
}