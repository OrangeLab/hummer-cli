import {CoreCli} from '@hummer/cli-core'
import {InitPlugin} from '@hummer/cli-plugin-init'
import {BuildPlugin} from '@hummer/cli-plugin-build'
import {DebugPlugin} from '@hummer/cli-plugin-debug'
import {DevicePlugin} from '@hummer/cli-plugin-device'
import {ToolPlugin} from '@hummer/cli-plugin-tool'
export class HummerCli extends CoreCli{
  loadDefaultPlugins(){
    this.core.addPlugin(InitPlugin)
    this.core.addPlugin(BuildPlugin)
    this.core.addPlugin(DebugPlugin)
    this.core.addPlugin(DevicePlugin)
    this.core.addPlugin(ToolPlugin)
  }
}