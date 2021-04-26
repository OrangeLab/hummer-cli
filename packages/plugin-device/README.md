# Hummer CLI Plugin Run
Hummer 的 native 启动命令
> Warning: 依赖 native 开发工具链，ios为xcode
# 参数说明

| 参数 | 是否必须 | 值 | 说明 |
| :-----| :---- | :----: | :---- |
| platform | 是 | ios/android | 启动平台 |
| path | 是 | 无 | 用于启动 native 工程 |
| -deviceOption | 否 | 无 | 是否启用手动选择启动设备，默认不开启 |
| -bundleId | 否 | 无 | 用于ios启动设备（预留） |

示例
```
hummer run  [platform]     [projectPath]   
hummer run  ios            xxx.workspace  
hummer run  ios            xxx.workspace      -deviceOption //启用手动选择
```
