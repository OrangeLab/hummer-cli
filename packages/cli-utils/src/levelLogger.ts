import { logger } from './logger'

export enum LogLevel {
    Verbose = 0,
    Debug = 1,
    Log = 2,
    Info = 3,
    Warning = 4,
    Error = 5,
    None = 6
}

export class LogHelper {

    public static get logLevel(): LogLevel {
        // todo parse cli options
        return LogLevel.Debug;
    }
}


export class LevelLogger {

    public static log(msg: string | Error, level = LogLevel.Log) {

        const levelConfig = LogHelper.logLevel;
        if (levelConfig == LogLevel.None) { return }
        const func = this.getLogFunc(level)
        if (levelConfig == LogLevel.Verbose || levelConfig == level){
          // @ts-ignore
          func(msg)
        }
    }
    public static verbose(msg: string = '') {
        this.log(msg, LogLevel.Verbose);
    }
    public static warn(msg: string = '') {
        this.log(msg, LogLevel.Warning);

    }
    public static debug(msg: string = '') {
        this.log(msg, LogLevel.Debug);
    }

    public static error(msg: string | Error = '') {

        this.log(msg, LogLevel.Error);
    }

    private static getLogFunc(level: LogLevel) {
        switch (level) {
            case LogLevel.Log:
                return logger.log;
            case LogLevel.Info:
                return logger.info;
            case LogLevel.Warning:
                return logger.warn;
            case LogLevel.Error:
                return logger.error;
            case LogLevel.Debug:
                return logger.debug;
            default:
                return logger.log;
        }
    }
}