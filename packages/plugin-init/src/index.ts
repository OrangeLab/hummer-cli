import {Core, Plugin} from '@hummer/cli-core'
import {getLoggerWithTag, ora, fse, cliConfig} from '@hummer/cli-utils'
import {execSync} from 'child_process'
import * as tar from 'tar';
import * as libPath from 'path'
import {sync as rm} from 'rimraf'
import {generate} from './generate'
const config = require('../config.json')
const {root} = cliConfig
const logger = getLoggerWithTag('hummer-init')

export class InitPlugin extends Plugin{
  name = 'init'
  constructor(core:Core, options:any, name?: string){
    super(core, options, name)
    this.commands = {
      init: {
        description: 'init a project',
        usage: 'hummer init --[option]=[value]',
        options: {
        },
        hooks: [this.create.bind(this)]
      }
    }
  }

  private async create(){
    let that = this;
    let spinner = ora(`Get remote template list...`)
    spinner.start()
    var templateList = await this.getRemoteTemplate()
    spinner.stop()
    
    let answers = await this.utils.inquirer.prompt([{
      type: 'list',
      name: 'template',
      message: 'Which template do you want init?',
      choices: templateList
    }, {
      type: 'input',
      name: 'projectName',
      message: 'Project name',
      default: function (answers: any) {
        let list = answers.template.split('/')
        let name =  list[1] ? list[1] : list[0]
        return name
      }
    }])
    const rootDir = this.getLocalPath()
    fse.ensureDirSync(rootDir)
    return new Promise<void>(async (resolve, reject) => {
      let spinner = ora(`Get template version and download...`)
      spinner.start()
      var templatePath = await that.getTempatePath(answers)
      spinner.stop()
      const projectName = answers.projectName
      generate(projectName, templatePath, libPath.resolve(projectName), function (err: Error) {
        if (err) {
          logger.error(err)
          reject()
        } else {
          logger.info(`Generated ${projectName}`)
          resolve()
        }
      })
    })
  }

  private async getRemoteTemplate(){
    return config.template
  }

  private getLocalPath(){
    return libPath.join(root, './node_modules', '.hummer')
  }

  private async getTempatePath(answers:any){
    let start = Date.now()
    let result = '{}'
    let templateName = `@hummer/cli-${answers.template}`
    try {
      result = execSync(`npm view ${templateName} dist-tags --json --registry=https://registry.npm.taobao.org/`, {
        stdio: [null],
        timeout: 5000
      }).toString();
    } catch (err) {
      logger.error(err)
      process.exit(1)
    }

    result = JSON.parse(result)
    var latestversion =  result['latest']
    var versionFullName = `${templateName.replace(/^@(\w+)\//, '$1-')}-${latestversion}`;
    var templateDir = libPath.join(this.getLocalPath(), 'cli-templates', versionFullName)
    var tgzPath = libPath.join(templateDir, `${versionFullName}.tgz`)

    if (!fse.pathExistsSync(templateDir)) {
      fse.ensureDirSync(templateDir)
      execSync(`npm pack ${templateName}@${latestversion} --registry=https://registry.npm.taobao.org/`, {
        cwd: templateDir,
        stdio: ['pipe', 'ignore'],
        timeout: 20000
      });
      await tar.x({
        file: tgzPath,
        cwd: templateDir,
      });
      rm(tgzPath)
    }
    return libPath.join(templateDir, 'package')
  }
}