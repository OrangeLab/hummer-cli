# 项目开发指南

## 项目介绍
此项目是Hummer脚手架`hummer cli`的开发仓库，使用lerna进行包关系管理、构建和发布

## 基本开发步骤
```
// 安装依赖
npm i

// lerna bootstrap
npm run bootsrap

// 开发&调试
npm run build:watch
// vscode调试配置
{
  "runtimeExecutable": "path-to-node",
  "type": "node",
  "request": "launch",
  "name": "HummerCli 调试专用",
  "program": "path-to-hummer-cli-project/packages/cli/bin/hummer.js",
  "args": ["dev"],
  "cwd": "path-to-hummer-project"
}

// 构建
npm run build

// 提交修改
// ...

// 发布npm包
// 由于是直接发布到npm 所以发包需要有npm `@hummer`组织的权限
// 发包权限相关请联系
// https://github.com/AdamCaoQAQ
// https://github.com/duanlikang
npm run pub
```