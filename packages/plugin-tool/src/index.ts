import { Core, Plugin } from '@hummer/cli-core';
import {getServer} from '@hummer/cli-utils';
import {LogPlugin} from './plugins/log';

export class ToolPlugin extends Plugin {
	name = 'tool'
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.commands = {
			tool: {
				description: 'hummer tool',
				usage: 'hummer tool',
				options: {
				},
				hooks: [this.run.bind(this)]
			}
		}
	}

	private run(){
		let server = getServer(8081)
		server.apply(new LogPlugin())
		server.start()
	}
}