import { logger } from './logger'

export enum LogLevel {
    None = 0,
    Info = 1,
    Debug = 2,
    Warning = 3,
    Error = 4,//无视 level，无条件log
    Verbose = 5,
}

export class LogHelper {

    public static get logLevel(): LogLevel {
        if (process && process.env && process.env.npm_config_logLevel) {
            // @ts-ignore
            return LogLevel[process.env.npm_config_logLevel];
        }
        return LogLevel.Info;
    }
}


export class LevelLogger {

    private static log(msg: string | Error, level = LogLevel.Info) {
        if (level === LogLevel.Error) {
            // @ts-ignore
            this.getLogFunc(level)(msg)
            return 
        }
        const levelConfig = LogHelper.logLevel;
        if (levelConfig == LogLevel.None) { return }

        if (level <= levelConfig) {
            // @ts-ignore
            this.getLogFunc(level)(msg)
        }
    }

    public static info(msg: string = '') {
        this.log(msg, LogLevel.Info);
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