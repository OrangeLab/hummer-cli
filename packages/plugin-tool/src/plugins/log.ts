import {Plugin, getLoggerWithTag} from '@hummer/cli-utils'
let logger = getLoggerWithTag("")
export const LOGTYPE = 'log';

export class LogPlugin implements Plugin{
  name = 'Log Plugin'
  onWsServerMessage(msg: string){
    try{
      let msgObj = JSON.parse(msg)
      if(msgObj.type === LOGTYPE){
        let data = msgObj.data
        let log = getLoggerByLevel(data.level)
        log(data.message)
      }
    }catch(err){
      
    }
  }
}

export enum LogLevel {
  LOG = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5
}
export function getLoggerByLevel(level:LogLevel){
  let log = logger.log
  switch(level){
    case LogLevel.LOG:
      log = logger.log
    case LogLevel.DEBUG:
      log = logger.log
      break;
    case LogLevel.INFO:
      log = logger.info
      break;
    case LogLevel.WARN:
      log = logger.warn
      break;
    case LogLevel.ERROR:
      log = logger.error
      break;
    default:
      log = logger.log
      break;
  }
  return log
} 