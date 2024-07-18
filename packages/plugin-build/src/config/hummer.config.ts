import { Configuration, SourceMapDevToolPlugin, DefinePlugin } from 'webpack'
import { getAssetsAddress } from '../utils/server'
import JsccPlugin from 'webpack-plugin-jscc'
import { ProjectConfig } from '@hummer/cli-utils'
import { BuildPlugin } from '../index'
import { pathExistsSync } from 'fs-extra'
import TerserPlugin from 'terser-webpack-plugin'

import path from 'path'
const exec = require('child_process').execSync

export default function getDefaultHummerConfiguration(isProduction: boolean, hmConfig: ProjectConfig, context: BuildPlugin): Configuration {
  let plugins = []
  let devToolLoaders = []
  let { map: needMap } = context.options
  if (hmConfig) {
    // TODO 自定义插件的配置，在这里进行拓展
    // TODO Validate Jscc Config
    if (hmConfig.jscc) {
      plugins.push(new JsccPlugin(hmConfig.jscc))
    }
  }
  if (!isProduction) {
    //issue:27 Modify SourceMapUrl 
    plugins.push(new SourceMapDevToolPlugin({
      module: true,
      columns: false,
      filename: "[name].js.map",
      append: '\n//# sourceMappingURL=' + getAssetsAddress() + '[url]'
    }))
    // 判断hummer项目中是否安装 tenon-devtool 
    let projectPath = process.cwd()
    let devToolInstalled = pathExistsSync(path.join(projectPath, 'node_modules', '@hummer', 'tenon-dev-tool'))
    if (!devToolInstalled) {
      exec('npm install @hummer/tenon-dev-tool --save')
    }
    devToolLoaders.push({
      loader: require.resolve('@hummer/devtool-inject-loader')
    })
  }
  let devToolConfig = needMap ? {
    devtool: isProduction ? 'hidden-source-map' : 'cheap-module-source-map',
  } : null;
  return {
    ...devToolConfig,
    mode: isProduction ? 'production' : 'development',
    output: {
      publicPath: './'
    },
    resolve: {
      extensions: [".ts", ".js"]
    },
    externals: {
      '@hummer/hummer-front': '__GLOBAL__',
      '@didi/hummer-front': '__GLOBAL__' // 兼容老版 CLI
    },
    module: {
      rules: [{
        // 不区分大小写
        test: /\.(ts|js)$/i,
        // exclude: /node_modules/,
        exclude: /node_modules(?!\/@babel\/runtime)/,
        use: [{
          loader: require.resolve('babel-loader'),
          options: {
            plugins: [
              [
                require.resolve('babel-plugin-polyfill-corejs3'),
                {
                  "method": "usage-pure",
                  "targets": {
                    "ios": 9
                  },
                  // runtime 读取 cli node_modules
                  absoluteImports: require.resolve('core-js-pure/package.json'),
                  // proposals 会导致 'esnext.' 相关内容（走了 core-js-pure/features 而不是 core-js-pure/stable）注入，实际上 stable 有同样的功能
                  // proposals: true,
                  shippedProposals: true
                }
              ]
            ],
            overrides: [
              {
                test: './src',
                presets: [
                  [
                    require.resolve('@babel/preset-env'),
                    {
                      targets: {
                        ios: 9
                      },
                      // https://babeljs.io/docs/en/babel-preset-env#shippedproposals
                      shippedProposals: true
                    }
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
              },
              {
                test: "./src/**/*.ts",
                presets: [
                  require.resolve('@babel/preset-typescript')
                ]
              }
            ]
          }
        }, ...devToolLoaders]
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
      }]
    },
    plugins: [
      new DefinePlugin({
        "HUMMER_COMPILE_TYPE": JSON.stringify('HUMMER') // 注入编译类型
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