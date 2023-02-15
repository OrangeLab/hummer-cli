import { Core, Plugin } from '@hummer/cli-core'
import { getProjectConfig, getLoggerWithTag, ora, IDevTool, ProjectConfig } from '@hummer/cli-utils'
import { getDefaultConfig } from './utils'
import { mergeConfig, getEntries, getPlugins } from './utils/webpack'
import { archive } from './utils/archive';
import { Compiler } from './compiler'
import { error } from '@hummer/cli-utils'
import Webpack from 'webpack'
const logger = getLoggerWithTag('hummer-build')

interface CompilerConfig {
  webConfig?: any,
  devTool?: IDevTool,
  webpackConfig?: any
}
export class BuildPlugin extends Plugin {

  name = 'build'
  private projectConfig: ProjectConfig | undefined
  private compilerConfig: CompilerConfig = {
    webConfig: {}
  }
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
    if (!this.options.NODE_ENV) {
      this.options.NODE_ENV = "production"
    }
    await this.generateConfig();
    this.compilerConfig.webpackConfig = await this.getWebpackConfig(this.compilerConfig.webConfig);

    let compiler = new Compiler();
    compiler.initConfig(this.compilerConfig);
    const spinner = ora('Building, please wait for a moment!\n')
    try {
      logger.info('✨ Start Build, please wait for a moment!')
      spinner.start()
      await compiler.build();
      if (this.options.archive && this.compilerConfig.webpackConfig?.output?.path) {
        await archive(this.compilerConfig.webpackConfig.output?.path);
      }
      logger.info('✨ Build Success!')
      spinner.stop()
    } catch (err:any) {
      logger.error(err.message)
      spinner.stop(err)
    }
  }

  private async dev() {
    // Dev 环境变量默认使用 development
    if (!this.options.NODE_ENV) {
      this.options.NODE_ENV = "development"
    }
    // Dev 环境变量默认打开 Map 开关
    if (!this.options.map) {
      this.options.map = true
    }
    await this.generateConfig();
    this.compilerConfig.webpackConfig = await this.getWebpackConfig();
    let compiler = new Compiler();
    compiler.initConfig(this.compilerConfig);
    compiler.dev();
  }

  private async getWebpackConfig(webConfig?: any) {
    let isProduction = this.options.production || this.options.NODE_ENV === 'production';
    let { type, webpack } = this.projectConfig as ProjectConfig
    let defaultConfig = getDefaultConfig(isProduction, type as any, this.projectConfig as ProjectConfig, this)
    if (webpack) {
      if (webpack.entries) {
        // web模拟器启动配置
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

  private async generateConfig() {
    // 1. Read Project Config
    this.projectConfig = await getProjectConfig(Webpack, this.options);
    if (!this.projectConfig) {
      error('hm.config.js 文件不规范，请检查！')
      process.exit();
    }
    
    this.compilerConfig.devTool = {
      ...{ web: true, qrCode: false },
      ...this.projectConfig.devTool
    }

    // 校验端口号
    if (this.compilerConfig.devTool?.devServerPort) {
      if (
        (typeof this.compilerConfig.devTool.devServerPort !== 'number')
        || this.compilerConfig.devTool.devServerPort < 0 
        || this.compilerConfig.devTool.devServerPort > 65535
      ) {
        error('devServerPort值不规范')
        process.exit();
      }
    }

    const env = process.env
    const modeStr = env.npm_config_mode || env.npm_config_modes || ''
    switch (modeStr) {
      case 'web':
        this.compilerConfig.webConfig['openWeb'] = 'web'
        break;
      default:
        this.compilerConfig.webConfig['openWeb'] = 'all'
        break;
    }
  }
}