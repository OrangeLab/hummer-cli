import { Configuration,SourceMapDevToolPlugin,DefinePlugin } from 'webpack'
import {TenonStylePlugin} from '@hummer/tenon-style-loader'
import JsccPlugin from 'webpack-plugin-jscc'
import {ProjectConfig} from '@hummer/cli-utils'
import {getAssetsAddress} from '../utils/server'
import * as path from 'path'
import { BuildPlugin } from '..'
import TerserPlugin from 'terser-webpack-plugin'

export default function getTenonReactConfiguration(isProduction: boolean, hmConfig:ProjectConfig, context: BuildPlugin): Configuration {
  let plugins:any = []
  let { map: needMap } = context.options
  if(hmConfig){
    if(hmConfig.jscc){
      plugins.push(new JsccPlugin(hmConfig.jscc))
    }
  }
  if(!isProduction){
    // #issue:27 Modify SourceMapUrl 
    plugins.push(new SourceMapDevToolPlugin({
      module: true,
      columns: false,
      filename: "[name].js.map",
      append: '\n//# sourceMappingURL='+ getAssetsAddress() + '[url]'
    }))
  }
  let devToolConfig = needMap ? {
    devtool: isProduction ? 'hidden-source-map' : 'cheap-module-source-map',
  }: null;
  return {
    ...devToolConfig,
    mode: isProduction?'production':'development',
    output: {
      publicPath: './'
    },
    resolve: {
      alias: {
      },
      extensions: [".js",'.json',".jsx", ".css" ]
    },
    externals: {
      '@hummer/hummer-front': '__GLOBAL__',
      '@didi/hummer-front': '__GLOBAL__' // 兼容老版 CLI
    },
    module: {
      rules: [{
        test: /\.less$/,
        use: [require.resolve('less-loader')]
      },{
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
        test: /\.(js|jsx)$/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              [
                require.resolve('@babel/preset-env'), 
                {
                  targets: {
                    "ios": "9"
                  }
                }
              ],
              [
                require.resolve('@babel/preset-react')
              ],
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
            ]
          }
        }
      }, {
        test: /\.css$/,
        use: {
          loader: path.join(require.resolve('@hummer/tenon-style-loader')),
          options: {
            packageName: '@hummer/tenon-react'
          }
        }
      },]
    },
    plugins: [
      new TenonStylePlugin({
        packageName: '@hummer/tenon-react'
      }),
      new DefinePlugin({
        "NODE_DEBUG_ENV": JSON.stringify(isProduction? false: true),  // 控制是否注入 DevTool
        "HUMMER_COMPILE_TYPE": JSON.stringify('TENON_REACT') // 注入编译类型
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
