import {Plugin} from './plugin'
import {getLoggerWithTag} from '../logger'

const logger = getLoggerWithTag('Server')
export class LogPlugin implements Plugin{
  name:string = "LogPlugin"

  onHttpServerStart(){
    logger.info('Http Server Start Success!')
  }

  onHttpServerClose(){
    logger.info('Http Server Closed Success!')
  }

  onWsServerStart(){
    logger.info('WebSocket Server Start Success!')
  }

  onWsServerClose(){
    logger.info('WebSocket Server Closed Success!')
  }

  onWsServerConnect(){
    logger.info('A Client Has Connected!')
  }

  onWsServerMessage(msg:string){
    logger.info('A Message Has Received:\n' + msg)
  }
}