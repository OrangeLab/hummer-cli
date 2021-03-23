import * as path from 'path'
export enum ProjectType {
  TENON = 'tenon',
  HUMMER = 'hummer',
  LIBRARY = 'library'
}

export interface ProjectConfig {
  type?: ProjectType,
  webpack: any,
  entries?: string
}

/**
 * 获取项目中的 hm.config.js 配置文件（如果存在）
 */
export async function getProjectConfig(webpack:any, env: any): Promise<ProjectConfig | undefined> {
  let projectPath = process.cwd();
  // import 当文件不存在的时候会抛出异常，建议直接返回 undefined
  var config
  try {
    config = await require(path.join(projectPath, 'hm.config.js'))
  } catch (exception) {
    console.error(exception)
    return
  }
  if(typeof config === "function"){
    return config(webpack, env)
  }
  if (Object.keys(config).length == 0) {
    return
  }

  return config;
}