import * as async from 'async'
import * as inquirer from 'inquirer'
import {getLoggerWithTag} from '@hummer/cli-utils'
const logger = getLoggerWithTag('sls-cli-plugin-init')

function evaluate(exp: string, data: any) {
  const fn = new Function('data', 'with (data) { return ' + exp + '}')
  try {
    return fn(data)
  } catch (e) {
    logger.error('Error when evaluating filter condition: ' + exp)
  }
}

const promptMapping = {
  string: 'input',
  boolean: 'confirm'
}

export const ask = function (prompts: any, data: any, done: any) {
  async.eachSeries(Object.keys(prompts), (key, next) => {
    prompt(data, key, prompts[key], next)
  }, done)
}

function prompt(data: any, key: string, prompt: any, done: any) {
  if (prompt.when && !evaluate(prompt.when, data)) {
    return done()
  }
  let promptDefault = prompt.default
  if (typeof prompt.default === 'function') {
    promptDefault = function () {
      return prompt.default.bind(this)(data)
    }
  }

  inquirer.prompt([{
    type: promptMapping[prompt.type] || prompt.type,
    name: key,
    message: prompt.message || prompt.label || key,
    default: promptDefault,
    choices: prompt.choices || [],
    validate: prompt.validate || (() => true)
  }]).then(function (answers: any) {
    if (Array.isArray(answers[key])) {
      data[key] = {}
      answers[key].forEach(function (multiChoiceAnswer: string) {
        data[key][multiChoiceAnswer] = true
      })
    } else if (typeof answers[key] === 'string') {
      data[key] = answers[key].replace(/"/g, '\\"')
    } else {
      data[key] = answers[key]
    }
    done()
  }).catch(done)
}
