# Hummer CLI
> Hummer & Tenon 的 CLI 工具体系

## Hummer CLI 使用教程
### CLI 命令集合
```
hummer -h        // 查看帮助
hummer -v        // 查看版本
hummer init      // 创建项目
hummer dev       // 编译并开启本地服务
hummer build     // 编译打包
hummer debug     // 开启调试服务
```

### 安装 Hummer CLI
```
// 安装
npm install @hummer/cli -g

// 更新
npm update @hummer/cli -g
```

### 创建项目
```
hummer init

// 输出以下内容，选择其中一种模块工程
? Which template do you want init? 
  template-vue 
  template-react
❯ template-ts 
  template-library
  template-android 
  template-ios 

// 接着输出以下内容，这里可以输入项目名称，按回车可直接使用默认值
? Project Name (hm-template-ts)

// 接着输出以下内容，这里可以输入项目描述，按回车可直接使用默认值
? Description (Hummer Project)

// 接着输出以下内容，这里可以输入项目作者，按回车可直接使用默认值
? Author (xxx <xxx@didichuxing.com>) 
```

### 编译打包
```
hummer build
```
> `--archive` 选择是否生成 打包文件的 Zip包


> *一般用于发布阶段，会对最终编译产物做混淆压缩*

### 编译并开启本地服务
```
hummer dev
```
> *一般用于开发阶段，不对最终编译产物做混淆压缩*


### 开启调试服务
```
hummer debug
```
### hm.config.js
Hummer CLI 业务中基础的配置，支持导出对象与函数，用于打包时使用。

文档参数介绍
| 属性名 | 类型 | 说明 | 示例 |
| ---- | ---- | ---- | ---- |
| type | Enum | 现在支持5种类型<br>tenon: Tenon Vue 仓库 <br>vue: Tenon Vue 仓库 <br>react: Tenon React 仓库 <br>hummer: Hummer 仓库 <br>library: 工具库仓库 | `type: 'tenon'` | 
| webpack | [WebpackConfig](https://webpack.js.org/configuration/) | 标准的可拓展的 Webpack配置  | 配置如下 | 

> 备注：webpack中的 entries 配置，glob 语法，支持拓展，编译时会自动解析 entries的多文件配置，覆盖 webpack entry 的配置，请按照需求背景选用。

#### Hm Config 支持两种配置方式
1. 纯静态的`hm.config.js`配置
```javascript
const path = require('path')
module.exports = {
  type: 'tenon', 
  webpack: {
    entries: "src/*/entry.js",
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: "[name].js"
    }
  }
}
```

2. 动态的`hm.config.js`配置，导出函数
```javascript
const path = require('path')
/**
 * options 执行命令时的配置
 * 举例子:
 * hummer build --production --env=test
 * options: {production:true, env: "test"}
 * @param {*} Webpack Webpack 实例
 * @param {*} options 命令传入的环境变量
 * @returns 
 */
module.exports = function(Webpack, options){
  let definePluginOptions = options.production?{
    "ISUNIPAY": true
  }: {
    "ISUNIPAY": false
  };
  return {
    type: 'tenon',
    webpack: {
      entries: "src/*/entry.js",
      output: {
        path: path.resolve(__dirname, './dist'),
        filename: "[name].js"
      },
      plugins: [new Webpack.DefinePlugin({
        env: options.env,
        ...definePluginOptions
      })]
    }
  }
}
```

### 常见的几种 `hm.config.js` 文件
#### Hummer
```javascript
const path = require('path')
module.exports = {
  type: 'hummer',
  webpack: {
    entries: "src/*/entry.ts",
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: "[name].js"
    }
  }
}
```
#### Tenon Vue
```javascript
const path = require('path')
module.exports = {
  type: 'vue',
  webpack: {
    entries: "src/*/entry.js",
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: "[name].js"
    }
  }
}
```
#### Tenon React
```javascript
const path = require('path')
module.exports = {
  type: 'react',
  webpack: {
    entries: "src/*/entry.js",
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: "[name].js"
    }
  }
}
```
#### Hummer Library
```javascript
const path = require('path')
module.exports = {
  type: 'library',
  webpack: {
    entries: "./src/index.ts",
    output: {
      library: "__COMMON__", // 对外暴露出的导出对象名称
      path: path.resolve(__dirname, './dist'),
      filename: "[name].js"
    },
    plugins: []
  }
}
```
### 配置环境变量
Hummer CLI 支持业务工程，通过配置环境变量实现差异打包，具体操作如下。

1. 修改 `hm.config.js`文件
```javascript
const path = require('path')
module.exports = function(Webpack, options){
  let definePluginOptions = options.production?{
    "mode": JSON.stringify("prod"),
    "baseUrl": '"http://www.baidu.com"',
    "ISPRODUCTION": true
  }: {
    "mode": JSON.stringify("dev"),
    "baseUrl": JSON.stringify("http://www.baidu.com")
  }
  return {
    type: 'tenon',
    webpack: {
      entries: "src/*/entry.js",
      output: {
        path: path.resolve(__dirname, './dist'),
        filename: "[name].js"
      },
      plugins: [new Webpack.DefinePlugin({
        env: options.env,
        ...definePluginOptions
      })]
    }
  }
}
```
> 注意：注入字符串变量时，需要进行`JSON.stringify()`或者进行包裹。具体原因是 Webpack DefinePlugin 只是在编译过程中将注入的环境变量进行简单的字符串替换，如果不包裹`''`，会被当成变量，导致运行失败。


注入环境变量后，业务代码中使用如下所示：
```javascript
// 业务中使用注入的环境变量，如下
export const BaseUrl = baseUrl
export const Mode = mode
```
> 注意：不要直接在 `Vue Template` 中使用环境变量，其不会被转换处理。


### 文件条件编译和代码条件编译
Hummer CLI 支持文件条件编译和代码条件编译。

文件条件编译指，我们可以通过配置 `extensions`的方式，实现不同后缀的文件，根据条件进行加载。

代码条件编译指，我们可以通过`C` 条件注释的方式来进行代码段的条件编译，适合所有文件。

