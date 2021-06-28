import { ProjectType, ProjectConfig } from '@hummer/cli-utils';
import {BuildPlugin} from '../index'

import getDefaultHummerConfiguration from '../config/hummer.config';
import getDefaultLibraryConfiguration from '../config/library.config';
import getDefaultTenonConfiguration from '../config/tenon.config';
import getDefaultReactConfiguration from '../config/tenon-react.config'
export * from './server'
/**
 * 获取项目的基本默认配置
 * TODO 重构获取配置模块，支持多种命令行配置，更加灵活
 * @param type 项目类型
 */
export function getDefaultConfig(isProduction: boolean, type: ProjectType, hmConfig: ProjectConfig, context:BuildPlugin) {
  let config = {}
  switch (type?.toLowerCase()) {
    case ProjectType.VUE:
    case ProjectType.TENON:
      config = getDefaultTenonConfiguration(isProduction, hmConfig, context)
      break;
    case ProjectType.REACT:
      config = getDefaultReactConfiguration(isProduction, hmConfig, context)
      break;
    case ProjectType.HUMMER:
      config = getDefaultHummerConfiguration(isProduction, context)
      break;
    case ProjectType.LIBRARY:
      config = getDefaultLibraryConfiguration(isProduction, context)
      break
    default:
      break;
  }
  return config
}

/**
 * 获取项目的基本默认配置
 * @param type 项目类型
 */
export function getEntryConfig(type?: ProjectType) {
  let reg = null
  switch (type?.toLowerCase()) {
    case ProjectType.TENON:
    case ProjectType.VUE:
    case ProjectType.REACT:
      reg = /([\w-]*)\/entry.js/
      break;
    case ProjectType.HUMMER:
      reg = /([\w-]*)\/index.ts/
      break;
    default:
      reg = /([\w-]*)\/index.js/
      break;
  }
  return reg
}

