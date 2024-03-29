import * as http from 'http'
// import Koa from 'koa'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { getPort } from '../utils/server'
import { readFileList } from './middleware'
import { IDevTool } from '@hummer/cli-utils'

const template = require('art-template')
const serveHandler = require('serve-handler')

const path = require('path')
const fs = require('fs')
const url = require('url')
export class WebServer extends EventEmitter {

    private server!: Server
    public WebServerPort: number = 5002
    constructor(public host: string, public port: number, public staticDir: string, public devTool: IDevTool) {
        super()
        this.start()
    }

    async start() {
        // const app = new Koa()
        const that = this
        let injectJsNames: Array<any> = []
        let fileList: string[] = [];
        let rootPath: string
        this.server = http.createServer()
        try {
            fs.accessSync(path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist'));
            rootPath = path.join(__dirname, '../../node_modules/@hummer/hummer-front/dist')
        } catch (err) {
            rootPath = path.join(__dirname, '../../../hummer-front/dist')
        }
        await this.initServerConfig()
        readFileList(this.staticDir, fileList);
        fileList = fileList.filter((file) =>
            /\.js$/.test(file)
        ).map(file =>
            file.split(`${this.staticDir}${path.sep}`)[1]
        )
        injectJsNames = fileList
        injectJsNames.forEach((item, index) => {
            injectJsNames[index] = item.split('.js')[0]
        });

        this.server.on('request', async function (req, res) {
            await serveHandler(req, res, {
                "public": rootPath,
                "cleanUrls": false,
                "directoryListing": [
                    "/favicon.ico"
                ],
            }, {
                sendError() {
                    let defaultPathname
                    const urlObj = url.parse(req.url, true)
                    if (req.url && req.url.startsWith('/images')) {
                        fs.readFile(`${that.staticDir}${req.url}`, function (err: any, data: any) {
                            if (err) {
                                console.log(err);
                            }
                            if (data) {
                                res.end(data)
                            }
                        })
                        return
                    }
                    if (injectJsNames.indexOf('index') >= 0) {
                        defaultPathname = '/index'
                    } else {
                        defaultPathname = `/${injectJsNames[0]}`
                    }
                    const pathName = (urlObj.pathname === '/' || urlObj.pathname === '/favicon.ico') ? defaultPathname : urlObj.pathname
                    let newInjectJsUrls: Array<any> = []
                    newInjectJsUrls[0] = `http://${that.host}:${that.port}${pathName}.js`
                    const filePath = path.join(rootPath, 'index.html')
                    const cssPath = `http://${req.headers.host}/index-browser.css`
                    const jsPath = `http://${req.headers.host}/index-browser.js`
                    fs.readFile(filePath, function (err: any, data: any) {
                        if (err) {
                            console.log(err);
                        }
                        if (data) {
                            let htmlstr = template.render(data.toString(), {
                                cssPath,
                                jsPath,
                                newInjectJsUrls
                            })
                            res.end(htmlstr)
                        }
                    })
                }
            })
        })
        this.server.listen({ port: this.WebServerPort }, () => {
            console.warn(`HummerFront Web http server listening , you can connect http server by http://${this.host}:${this.WebServerPort}/ ...`);
            // open(`http://${this.host}:${this.WebServerPort}/`)
        })
    }
    async initServerConfig() {
        let port = await getPort();
        this.WebServerPort = this.devTool?.webServerPort || port;
    }

    stop() {
        this.server && this.server.close()
    }

}