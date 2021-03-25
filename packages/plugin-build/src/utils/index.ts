import { ProjectType, ProjectConfig } from '@hummer/cli-utils';
import * as portfinder from 'portfinder';
import * as address from 'address';

import getDefaultHummerConfiguration from '../config/hummer.config';
import getDefaultLibraryConfiguration from '../config/library.config';
import getDefaultTenonConfiguration from '../config/tenon.config';
/**
 * 获取项目的基本默认配置
 * @param type 项目类型
 */
export function getDefaultConfig(isProduction: boolean, type?: ProjectType, hmConfig?: ProjectConfig) {
  let config = {}
  switch (type?.toLowerCase()) {
    case ProjectType.TENON:
      config = getDefaultTenonConfiguration(isProduction, hmConfig)
      break;
    case ProjectType.HUMMER:
      config = getDefaultHummerConfiguration(isProduction)
      break;
    case ProjectType.LIBRARY:
      config = getDefaultLibraryConfiguration(isProduction)
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

export function getPort() {
  return portfinder.getPortPromise();
}

export function getHost() {
  return address.ip();
}
