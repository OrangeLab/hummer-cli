import {CoreCli} from '@hummer/cli-core'
import {InitPlugin} from '@hummer/cli-plugin-init'
import {BuildPlugin} from '@hummer/cli-plugin-build'
import {DebugPlugin} from '@hummer/cli-plugin-debug'

export class HummerCli extends CoreCli{
  loadDefaultPlugins(){
    this.core.addPlugin(InitPlugin)
    this.core.addPlugin(BuildPlugin)
    this.core.addPlugin(DebugPlugin)
  }
}