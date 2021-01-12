import { Configuration } from 'webpack'

export default function getDefaultLibraryConfiguration(isProduction: boolean): Configuration {
    return {
        mode: isProduction ? 'production' : 'development',
        // Stop compilation early in production
        bail: isProduction,
        devtool: isProduction ? 'hidden-source-map' : 'cheap-module-source-map',
        output: {
            // this defaults to 'window', but by setting it to 'this' then
            // module chunks which are built will work in web workers as well.
            globalObject: 'this'
        },
        resolve: {
            // 在 webpack 默认配置情况上增加 .ts 文件解析
            extensions: ['.wasm', '.mjs', '.js', '.json', '.ts']
        },
        module: {
            rules: [{
                // 不区分大小写
                test: /\.(ts|js)$/i,
                // exclude: /node_modules/,
                exclude: /node_modules(?!\/@babel\/runtime)/,
                use: {
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
                            },
                        ]
                    }
                }
            }]
        },
    }
}