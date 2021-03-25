import { Configuration } from 'webpack'
import {VueLoaderPlugin} from '@hummer/tenon-loader'
import JsccPlugin from 'webpack-plugin-jscc'
import {ProjectConfig} from '@hummer/cli-utils'

export default function getDefaultTenonConfiguration(isProduction: boolean, hmConfig?:ProjectConfig): Configuration {
  let plugins = [new VueLoaderPlugin()]
  if(hmConfig){
    // TODO 自定义插件的配置，在这里进行拓展
    // TODO Validate Jscc Config
    if(hmConfig.jscc){
      plugins.push(new JsccPlugin(hmConfig.jscc))
    }
  }

  return {
    mode: isProduction?'production':'development',
    devtool: isProduction ? 'hidden-source-map' : 'cheap-module-source-map',
    output: {
      publicPath: './'
    },
    resolve: {
      alias: {
      },
      extensions: [".js",'.json',".jsx",".vue", ".css" ]
    },
    externals: {
      '@hummer/hummer-front': '__GLOBAL__',
      '@didi/hummer-front': '__GLOBAL__' // 兼容老版 CLI
    },
    module: {
      rules: [{
        test: /\.vue$/,
        use: {
          loader: require.resolve('@hummer/tenon-loader')
        }
      }, {
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
        test: /\.js$/,
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
              ]
            ]
          }
        }
      }]
    },
    plugins: plugins
  }
}
