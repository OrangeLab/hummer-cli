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
  template-android 
  template-ios 

// 接着输出以下内容，这里可以输入项目名称，按回车可直接使用默认值
? Project Name (hm-template-ts)

// 接着输出以下内容，这里可以输入项目描述，按回车可直接使用默认值
? Description (Hummer Project)

// 接着输出以下内容，这里可以输入项目作者，按回车可直接使用默认值
? Author (zhangdanfeng <zhangdanfeng@didichuxing.com>) 
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
