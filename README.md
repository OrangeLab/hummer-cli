# Hummer CLI
> Hummer & Tenon 的 CLI 工具体系

#### 系统设计
##### 整体架构图
![架构图](https://pt-starimg.didistatic.com/static/starimg/img/r6NuBU5fND1599047588548.png)

CLI 使用教程
===

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
npm install @didi/hummer-cli -g

// 更新（如果需要）
npm update @didi/hummer-cli -g
```

### 创建项目
```
hummer init

// 输出以下内容，选择其中一种模块工程
? Which template do you want init? 
  template-vue 
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

### 编译并开启本地服务
```
hummer dev
```
> *一般用于开发阶段，不对最终编译产物做混淆压缩*

### 编译打包
```
hummer build
```
> *一般用于发布阶段，会对最终编译产物做混淆压缩*

### 开启调试服务
```
hummer debug
```
### hm.config.js
Hummer CLI 业务中基础的配置，支持导出对象与函数，用于打包时使用。

文档参数介绍
| 属性名 | 类型 | 说明 | 示例 |
| ---- | ---- | ---- | ---- |
| type | Enum | 现在支持三种类型<br>tenon: Tenon Vue 仓库 <br>hummer: Hummer 仓库 <br>library: 工具库仓库 | `type: 'tenon'` | 
| webpack | [WebpackConfig](https://webpack.js.org/configuration/) | 标准的可拓展的 Webpack配置  | 配置如下 | 

> 备注：webpack中的 entries 配置，glob 语法，支持拓展，编译时会自动解析 entries的多文件配置，覆盖 webpack entry 的配置。请按照需求背景选用。

纯静态的 hm.config.js 配置
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

动态的 hm.config.js 配置，导出函数
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

注入环境变量后，业务代码中使用如下所示：
```javascript
// 业务中使用注入的环境变量，如下
import ComponentItem from './component-item.vue'
import PriceItem from './price-item.vue'
export const Item = ISUNIPAY? ComponentItem : PriceItem;
```