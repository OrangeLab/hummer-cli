import { Configuration } from 'webpack'
import {VueLoaderPlugin} from '@hummer/tenon-loader'

export default function getDefaultTenonConfiguration(isProduction: boolean): Configuration {
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
    plugins: [new VueLoaderPlugin()]
  }
}
