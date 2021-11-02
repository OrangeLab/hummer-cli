import { Core, Plugin } from '@hummer/cli-core';
import { LevelLogger , cliConfig} from '@hummer/cli-utils';
import { DebugSeverDescription } from './proxy/types';
import { DebugServer } from './proxy/debugServer';
import * as portfinder from 'portfinder';
import * as child_process from 'child_process';
import * as path from 'path';

const needle = require('needle');
/**
 * 提供 设备 <--> debug UI 通信服务。
 * 为了支持多 会话调试。debug service 服务设计如下：
 * 
 * 						global debug service（8081） 目前端上没办法写入ip，只能固定 port
 * 
 * hummer debug(server) 	hummer debug(server) 	 hummer debug(server)
 */
export class DebugPlugin extends Plugin {
	name = 'debug'
	private cliConfig:any = {};
	private port = 8081
	constructor(core: Core, options: any, name?: string) {
		super(core, options, name)
		this.cliConfig = cliConfig;
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

	private async debug() {

		let devPort = this.options.devPort ? this.options.devPort : 8000;
		//step1 : launch debug server for event loop
		const server = new DebugServer(this.port, devPort, process.cwd());
		await server.createServer();

		//step2 : start global debug server
		const validPort = await portfinder.getPortPromise({ port: this.port });
		if (validPort == this.port) {

			const globalServerPath = path.join(this.cliConfig.root,"/node_modules/@hummer/cli-plugin-debug/dist/proxy/entry.js")
			
			// 8081 is valid
			const cp = child_process.fork(globalServerPath, [`${this.port}`], { detached: true });
			cp.on("message", (msg) => {

				LevelLogger.info(`Global Debug Service Has Started! Pid:${cp.pid}`);
				// start debug server
				server.start().then(()=>{
					LevelLogger.info('Debug Service Has Started!');
				});
			});
		} else {

			// is hummer debug process ?
			this.checkDebug(devPort).then(() => {

				// global debug server is valid
				return server.start();
			}).then(() => {
				LevelLogger.info('8081端口被占用，已复用 debug server');
			}).catch(err => {

				//port 8081 is occupied
				LevelLogger.error(`8081端口被占用，errMsg: ${err.message}`);
			})
		}


	}
	private checkDebug(devPort: number): Promise<void> {

		return new Promise((resolve, reject) => {
			needle('get', `http://localhost:${this.port}/debug/server/list`, {}, { json: true })
				.then((resp: any) => {
					const debugList = resp.body as Array<DebugSeverDescription>;
					const isDuplicate = debugList.filter(val => {
						return val.devPort == devPort;
					});
					if (isDuplicate.length == 0) {
						resolve();
					} else {
						reject(new Error(`devPort : ${devPort} 已经处于debug状态，请检查 debug 参数是否正确`))
					}
				}).catch((e: any) => {
					reject(new Error("8081端口被占用，请释放对应的端口"))
				});
		})
	}
}