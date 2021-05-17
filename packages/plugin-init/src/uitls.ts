const path = require('path')
const metadata = require('read-metadata')
const exists = require('fs').existsSync
const exec = require('child_process').execSync
const validateName = require('validate-npm-package-name')
const config = require('config.json')
interface Template{
  name: string,
  needInstall: boolean,
  package: string
}

export const getGitUser = function (): string {
  let name
  let email
  try {
    name = exec('git config --get user.name')
    email = exec('git config --get user.email')
  } catch (e) {}

  name = name && JSON.stringify(name.toString().trim()).slice(1, -1)
  email = email && (' <' + email.toString().trim() + '>')
  return (name || '') + (email || '')
}

export const getTplOpts = function (name: string, dir: string): any {
  const opts = getMetadata(dir)
  // setDefault(opts, 'name', name)
  // setValidateName(opts)

  const author = getGitUser()
  if (author) {
    setDefault(opts, 'author', author)
  }
  return opts
}

function getMetadata (dir: string) {
  const json = path.join(dir, 'meta.json')
  const js = path.join(dir, 'meta.js')
  let opts = {}

  if (exists(json)) {
    opts = metadata.sync(json)
  } else if (exists(js)) {
    const req = require(path.resolve(js))
    if (req !== Object(req)) {
      throw new Error('meta.js needs to expose an object')
    }
    opts = req
  }
  return opts
}

function setDefault (opts: any, key: string, val: string) {
  if (opts.schema) {
    opts.prompts = opts.schema
    delete opts.schema
  }
  const prompts = opts.prompts || (opts.prompts = {})
  if (!prompts[key] || typeof prompts[key] !== 'object') {
    prompts[key] = {
      'type': 'string',
      'default': val
    }
  } else {
    prompts[key]['default'] = val
  }
}

function setValidateName (opts: any) {
  const name = opts.prompts.name
  const customValidate = name.validate
  name.validate = function (name: string) {
    const its = validateName(name)
    if (!its.validForNewPackages) {
      const errors = (its.errors || []).concat(its.warnings || [])
      return 'Sorry, ' + errors.join(' and ') + '.'
    }
    if (typeof customValidate === 'function') return customValidate(name)
    return true
  }
}

/**
 * 获取模板仓库列表
 * @returns Array<string>
 */
export function getTemplates():Array<string>{
  return config.templates.map((item:Template) => {
    return item.name
  })
}

export function getTemplateConfigByName(name:string){
  return config.templates.some(n)
}