import { Core, Plugin } from '@hummer/cli-core';
const {runInspectorProxy} = require('metro-inspector-proxy');
import {info, error} from '@hummer/cli-utils';

export class DevicePlugin extends Plugin {
	name = 'debug'
	private port = 8081
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.commands = {
			run: {
				description: 'debug project',
				usage: 'hummer debug --[option]=[value]',
				options: {
 					// '--port': "debug server port",
				},
				hooks: [this.debug.bind(this)]
			}
		}
	}

	private debug(){
		let root = process.cwd();
		try{
			runInspectorProxy(this.port, root)
			info('Debug Service Has Started!')
		}catch(err){
			error('8081端口被占用，请释放对应的端口')
		}
	}
}