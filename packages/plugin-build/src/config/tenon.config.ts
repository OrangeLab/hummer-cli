import { Configuration, DefinePlugin } from 'webpack'
import { TenonStylePlugin } from '@hummer/tenon-style-loader'
import { VueLoaderPlugin } from '@hummer/tenon-loader'
import JsccPlugin from 'webpack-plugin-jscc'
import { ProjectConfig } from '@hummer/cli-utils'
import * as path from 'path'
import { BuildPlugin } from '..'
import { VueFileMapper, VueHandling } from './vue/vueFileMapper'
import TerserPlugin from 'terser-webpack-plugin'


interface ModuleFilenameTemplateInfo {
  identifier : string,
  resource : string,
  resourcePath : string,
  allLoaders : Array<any>,
  hash : number,
  namespace : string,
}

export default function getDefaultTenonConfiguration(isProduction: boolean, hmConfig: ProjectConfig, context: BuildPlugin): Configuration {
  let plugins: any = []
  let { map: needMap } = context.options
  if (hmConfig) {
    // TODO 自定义插件的配置，在这里进行拓展
    // TODO Validate Jscc Config
    if (hmConfig.jscc) {
      plugins.push(new JsccPlugin(hmConfig.jscc))
    }
  }
  let devToolConfig = needMap ? {
    devtool: isProduction ? 'hidden-source-map' : 'cheap-module-source-map',
  } : null;
  
  //fix https://github.com/OrangeLab/hummer-cli/issues/29
  /**
   * vue-loader 会生成: webpack://src/app.vue?hash 形式的 sourcemap
   * 具体见：https://github.com/vuejs/vue/issues/11023
   * 
   * vscode 使用正则匹配，忽略 此类型的源文件
   * 见：https://github.com/microsoft/vscode-js-debug/commit/2f3c93a08df0ceb09eda86251d0309d34bfb26ef
   * 但尽在 debugger type = chrome 下生效。
   * 
   * 由于目前 hummer inpector proxy 服务没有实现 CDP Target 相关协议。https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-attachToBrowserTarget
   * 因此通过 cli 过滤此类型文件。
   */
  // 

  return {
    ...devToolConfig,
    mode: isProduction ? 'production' : 'development',
    output: {
      publicPath: './',
      devtoolFallbackModuleFilenameTemplate: (info:ModuleFilenameTemplateInfo) => {
        // webpack devtool:source-map 默认 sources 生成规则：webpack://[namespace]/[resourcePath]?[hash]
        var sourceName;
        // 如果是 vue-loader source。重新分配路径
        const vueLoadScheme = 'webpack:///conflict/';
        const defaultScheme = '`webpack:///';
        if(info.namespace && info.namespace.length>0){
          sourceName = `${info.namespace}/${info.resourcePath}?${info.hash}`;
        }else{
          sourceName = `${info.resourcePath}?${info.hash}`;
        }
        switch (VueFileMapper.getVueHandling(sourceName)) {
          case VueHandling.Omit:
            return `${vueLoadScheme}${sourceName}`;
          case VueHandling.Lookup:
            //todo lookup file          
            break;
          default:
          // fall through
        }      
        return `${defaultScheme}${sourceName}`;        
      },
    },
    resolve: {
      alias: {
      },
      extensions: [".ts", ".js", '.json', ".jsx", ".vue", ".css"]
    },
    externals: {
      '@hummer/hummer-front': '__GLOBAL__',
      '@didi/hummer-front': '__GLOBAL__' // 兼容老版 CLI
    },
    module: {
      rules: [{
        test: /\.vue$/,
        use: {
          loader: require.resolve('@hummer/tenon-loader'),
          options: {
            ...(hmConfig.buildOptions?.tenonLoaderOptions || {})
          }
        }
      }, {
        test: /\.less$/,
        use: [require.resolve('less-loader')]
      }, {
        test: /\.(png|jpg|jpeg|gif)$/i,
        use: [
          {
            loader: require.resolve('file-loader'),
            options: {
              name: '[name].[ext]',
              outputPath: 'images'
            }
          }
        ],
      }, {
        test: /\.(t|j)s$/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              [
                require.resolve('@babel/preset-env'),
                {
                  targets: {
                    "ios": "9"
                  },
                  modules: false,
                  shippedProposals: true
                }
              ],
              [require.resolve('@babel/preset-typescript'), {
                allExtensions: true
              }]
            ],
            plugins: [
              [require.resolve('@babel/plugin-transform-runtime'), {
                useESModules: true,
                absoluteRuntime: require.resolve('@babel/runtime/package.json'),
                // Undocumented option that lets us encapsulate our runtime, ensuring
                // the correct version is used
                // https://github.com/babel/babel/blob/090c364a90fe73d36a30707fc612ce037bdbbb24/packages/babel-plugin-transform-runtime/src/index.js#L35-L42
                version: require('@babel/runtime/package.json').version,
              }]
            ],
            sourceType: "unambiguous",
            ...(hmConfig.buildOptions?.babelOptions || {})
          }
        }
      }, {
        test: /\.css$/,
        use: {
          loader: path.join(require.resolve('@hummer/tenon-style-loader')),
          options: {
            ...(hmConfig.buildOptions?.tenonStyleLoaderOptions || {})
          }
        }
      },]
    },
    plugins: [
      new TenonStylePlugin({
        ...(hmConfig.buildOptions?.tenonStyleLoaderOptions || {})
      }),
      new VueLoaderPlugin(),
      new DefinePlugin({
        "NODE_DEBUG_ENV": JSON.stringify(isProduction ? false : true), // 控制是否注入 DevTool
        "HUMMER_COMPILE_TYPE": JSON.stringify('TENON_VUE') // 注入编译类型
      }),
      ...plugins
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          extractComments: false,//不将注释提取到单独的文件中
        }),
      ],
    }
  }
}
