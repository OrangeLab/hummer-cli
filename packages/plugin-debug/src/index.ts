import { Core, Plugin } from '@hummer/cli-core';
import runInspectorProxy from './proxy/entry'
import { LevelLogger } from '@hummer/cli-utils';

export class DebugPlugin extends Plugin {
	name = 'debug'
	private port = 8081
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.commands = {
			debug: {
				description: 'debug project',
				usage: 'hummer debug --[option]=[value]',
				options: {
 					'--devPort': "dev server port",
				},
				hooks: [this.debug.bind(this)]
			}
		}
	}

	private debug(){
		let devPort = this.options.devPort ? this.options.devPort : 8000;
		let root = process.cwd();
		try{
			runInspectorProxy(this.port, devPort, root);
			LevelLogger.info('Debug Service Has Started!');
		}catch(err){
			LevelLogger.error('8081端口被占用，请释放对应的端口');
		}
	}
}