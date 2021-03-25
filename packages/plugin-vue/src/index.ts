import { Core, Plugin } from '@hummer/cli-core';
import {info, error} from '@hummer/cli-utils';

export class VuePlugin extends Plugin {
	name = 'Vue'
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.commands = {
			vue: {
				description: 'transform vue project',
				usage: 'hummer vue --[option]=[value]',
				options: {
				},
				hooks: [this.transform.bind(this)]
			}
		}
	}

	private transform(){
		info('transform vue……')
	}
}