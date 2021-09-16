import chalkOrigin from 'chalk'
import oraOrigin from 'ora'
import * as readline from 'readline'

export const chalk: any  = chalkOrigin
export const ora: any  = oraOrigin
const globalVar: any = global

export const log = (msg: string = '', tag?: string) => {
  tag ? console.log(format(chalkTag(tag), msg)) : console.log(msg)
}

export const debug = (msg: string = '', tag?: string) => {
  console.debug(format(chalk.bgCyan.black(' DEBUG ') + (tag ? chalkTag(tag) : ''), msg))
}

export const info = (msg: string = '', tag?: string) => {
  console.log(format(chalk.bgBlue.black(' INFO ') + (tag ? chalkTag(tag) : ''), msg))
}

export const warn = (msg: string = '', tag?: string) => {
  console.warn(format(chalk.bgYellow.black(' WARN ') + (tag ? chalkTag(tag) : ''), chalk.yellow(msg)))
}

export const error = (msg: string | Error = '', tag?: string) => {
  console.error(format(chalk.bgRed(' ERROR ') + (tag ? chalkTag(tag) : ''), chalk.red(msg)))
  if (msg instanceof Error) {
    if (msg.stack) {
      var stackList = msg.stack.split('\n')
      stackList.splice(0, 1,)
      msg.stack = stackList.join('\n')
    }
    if (msg.stack) {
      console.error(format('', chalk.red(msg.stack)))
    }
  }
}

export const done = (msg: string = '', tag?: string) => {
  console.log(format(chalk.bgGreen.black(' DONE ') + (tag ? chalkTag(tag) : ''), msg))
}

export const clearConsole = (msg: string) => {
  if (process.stdout.isTTY) {
    const blank = '\n'.repeat(process.stdout.rows)
    console.log(blank)
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
    if (msg) {
      console.log(msg)
    }
  }
}

const format = (label: string, msg: string) => {
  return msg.split('\n').map((line, i) => {
    return i === 0
      ? `${label} ${line}`
      : `${label} ${line}`
  }).join('\n')
}

const chalkTag = function (msg: string) {
  return chalk.bgBlackBright.white.dim(` ${msg} `)
}


export const formatHelp = function (command: any, splitLength?: number): string {
  if (Array.isArray(command)) {
    return command.map(function (command) { return formatHelp(command, 60)}).join('\n')
  }
  const result = []
  result.push(command.pluginName)
  result.push(command.commandName)

  if (command.description) {
    result.push(command.description)
  }
  if (command.usage) {
    result.push(command.usage)
  }
  const optionsList: any = []
  let maxLength = 0;
  let padding = 10

  if (command.optionList) {
    command.optionList.map(function (info: any) {
      const param = '  ' + info.param;
      if (param.length > maxLength) {
        maxLength = param.length + padding;
      }
      optionsList.push({
        param,
        desc: info.desc || '',
      });
    });
  }
  optionsList.forEach(function (option: any) {
    result.push(option.param.padEnd(maxLength, ' ') + option.desc);
  })
  if (splitLength) {
    result.push(''.padEnd(splitLength, '-'))
  }
  return result.join('\n')
};

export const warpSpinnerCtr = function (fun:Function) {
  return function(msg: any) {
    globalVar._loadSpinner && globalVar._loadSpinner.stop()
    fun.apply(null, [msg])
    globalVar._loadSpinner && globalVar._loadSpinner.start()
  }
}
export const getLoggerWithTag = function (tag: string) {
  return {
    log: warpSpinnerCtr(function (msg: string) {
      log(msg, tag)
    }),
    info: warpSpinnerCtr(function (msg: string) {
      info(msg, tag)
    }),
    warn: warpSpinnerCtr(function (msg: string) {
      warn(msg, tag)
    }),
    error: warpSpinnerCtr(function (msg: string | Error) {
      error(msg, tag)
    }),
    done: warpSpinnerCtr(function (msg: string) {
      done(msg, tag)
    }),
    clearConsole: clearConsole
  }
}
export const logger = {
  log,
  info,
  warn,
  debug,
  error,
  done,
  clearConsole,
  getLoggerWithTag
}

