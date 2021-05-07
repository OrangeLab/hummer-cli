import { Core, Plugin } from '@hummer/cli-core';
import {getServer} from '@hummer/cli-utils';

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
		let server = getServer()
		server.start()
	}
}