# Hummer CLI Utils
## 介绍
提供 CLI 的基础工具库，供插件内核和各个插件使用。

## 支持能力
### logger
方法集
- log
- info
- warn
- error
- done
- clearConsole
- getLoggerWithTag

#### log
打印日志

`log(msg: string = '', tag?: string)`
- msg 打印的日志信息
- tag 标签
#### info
打印日志, Level Info

`info(msg: string = '', tag?: string)`
- msg 打印的日志信息
- tag 标签

#### warn
打印日志, Level Warn

`warn(msg: string = '', tag?: string)`
- msg 打印的日志信息
- tag 标签

#### error
打印日志, Level Error

`error(msg: string = '', tag?: string)`
- msg 打印的日志信息
- tag 标签

#### done
打印日志, Level Done

`done(msg: string = '', tag?: string)`
- msg 打印的日志信息
- tag 标签

#### clearConsole
清空控制台

`clearConsole()`

#### getLoggerWithTag
获取特定 Tag的 Logger对象

`getLoggerWithTag(tag:string)`



### inquirer
npm 包 `inquirer`

### fse
npm 包 `fs-extra`

### home
npm 包 `user-home`

### Config
获取当前 CLI 配置信息
- cliConfig
- initCliConfig
- getProjectConfig

#### cliConfig
获取当前打包的配置

#### initCliConfig(config)
初始化 CLI Config

#### getProjectConfig()
获取项目中的 `hm.config.js` 配置

### Server 篇
提供通用的 Http Server 和 WebSocket 服务，作为单一实例，一次命令中有仅会有一个 Server。
#### 能力
- 提供独立的 Http Server 和 Web Socket 服务
- 支持各个插件快速自定义中间件
- 保证服务唯一性，同时多个插件命令，进行服务复用，防止端口占用
- 自动判断可用端口号，默认`8080`端口

#### API
