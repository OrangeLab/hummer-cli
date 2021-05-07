import { Core, Plugin } from '@hummer/cli-core';
import {info, error} from '@hummer/cli-utils';

export class ToolPlugin extends Plugin {
	name = 'tool'
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.commands = {
			debug: {
				description: 'hummer tool',
				usage: 'hummer tool',
				options: {
				},
				hooks: [this.run.bind(this)]
			}
		}
	}

	private run(){
		let root = process.cwd();
		try{
			info('Debug Service Has Started!')
		}catch(err){
			error('8081端口被占用，请释放对应的端口')
		}
	}
}