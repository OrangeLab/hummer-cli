import { Core, Plugin } from '@hummer/cli-core'
import { getProjectConfig, getLoggerWithTag, ora } from '@hummer/cli-utils'
import { getDefaultConfig } from './utils'
import { mergeConfig, getEntries, getPlugins } from './utils/webpack'
import { archive } from './utils/archive';
import { Compiler } from './compiler'
import { error } from '@hummer/cli-utils'
import Webpack from 'webpack'
const logger = getLoggerWithTag('hummer-build')
export class BuildPlugin extends Plugin {

  name = 'build'

  constructor(core: Core, options: any, name?: string) {
    super(core, options, name)
    this.commands = {
      build: {
        description: 'build project',
        usage: 'hummer build --[option]=[value]',
        options: {
          archive: "build project and zip the output"
        },
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
    // Build 环境变量默认使用 production
    const webConfig: any = {}
    if (!this.options.NODE_ENV) {
      this.options.NODE_ENV = "production"
    }
    const env = process.env
    const modeStr = env.npm_config_mode || env.npm_config_modes || ''
    switch (modeStr) {
      case 'web':
        webConfig['openWeb'] = 'web'
        break;
      default:
        webConfig['openWeb'] = 'all'
        break;
    }
    let config = await this.getWebpackConfig(webConfig);
    let compiler = new Compiler();
    compiler.initConfig(config, webConfig);
    const spinner = ora('Building, please wait for a moment!\n')
    try {
      logger.info('✨ Start Build, please wait for a moment!')
      spinner.start()
      await compiler.build();
      if (this.options.archive && config.output?.path) {
        await archive(config.output?.path);
      }
      logger.info('✨ Build Success!')
      spinner.stop()
    } catch (err) {
      logger.error(err.message)
      spinner.stop(err)
    }
  }

  private async dev() {
    // Dev 环境变量默认使用 development
    const webConfig: any = {}
    if (!this.options.NODE_ENV) {
      this.options.NODE_ENV = "development"
    }
    const env = process.env
    const modeStr = env.npm_config_mode || env.npm_config_modes || ''
    switch (modeStr) {
      case 'web':
        webConfig['openWeb'] = 'web'
        break;
      default:
        webConfig['openWeb'] = 'all'
        break;
    }
    // Dev 环境变量默认打开 Map 开关
    if (!this.options.map) {
      this.options.map = true
    }
    let config = await this.getWebpackConfig();
    let compiler = new Compiler();
    compiler.initConfig(config, webConfig);
    compiler.dev();
  }

  private async getWebpackConfig(webConfig?: any) {
    // 1. Read Project Config
    let isProduction = this.options.production || this.options.NODE_ENV === 'production';
    let projectConfig = await getProjectConfig(Webpack, this.options);
    if (!projectConfig) {
      error('hm.config.js 文件不规范，请检查！')
      process.exit();
    }
    let { type, webpack } = projectConfig
    let defaultConfig = getDefaultConfig(isProduction, type as any, projectConfig, this)
    if (webpack) {
      if (webpack.entries) {
        if (webConfig?.openWeb === 'web') {
          let plugins = getPlugins(webpack?.plugins || [])
          webpack.plugins = plugins
        }
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