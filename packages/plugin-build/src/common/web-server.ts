import * as http from 'http'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { getPort } from '../utils/server'
import { readFileList } from './middleware'

const template = require('art-template')
const serveHandler = require('serve-handler')

const open = require('open')
const path = require('path')
const fs = require('fs')
const url = require('url')
const request = require('request');
const rootPath = path.join(__dirname, '../../node_modules/@hummer/hummer-front/')
export class WebServer extends EventEmitter {

    private server!: Server
    public WebServerPort: number = 5002
    constructor(public host: string, public port: number, public staticDir: string) {
        super()
        this.start()
    }

    async start() {
        const that = this
        this.server = http.createServer()
        let injectJsNames: Array<any> = []
        await this.initServerConfig()
        let fileList: string[] = [];
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
                "public": path.join(rootPath, 'dist'),
                "cleanUrls": false,
                "directoryListing": [
                    "/favicon.ico"
                ]
            }, {
                sendError() {
                    let defaultPathname
                    const urlObj = url.parse(req.url, true)
                    if (injectJsNames.indexOf('index') >= 0) {
                        defaultPathname = '/index'
                    } else {
                        defaultPathname = `/${injectJsNames[0]}`
                    }
                    const pathName = (urlObj.pathname === '/' || urlObj.pathname === '/favicon.ico') ? defaultPathname : urlObj.pathname
                    let newInjectJsUrls: Array<any> = []
                    newInjectJsUrls[0] = `http://${that.host}:${that.port}${pathName}.js`
                    const filePath = path.join(rootPath, 'dist/index.html')
                    const cssPath = `http://${req.headers.host}/index-browser.css`
                    const jsPath = `http://${req.headers.host}/index-browser.js`
                    fs.readFile(filePath, function (err: any, data: any) {
                        if (err) {
                            console.log(err);
                        }
                        let htmlstr = template.render(data.toString(), {
                            cssPath,
                            jsPath,
                            newInjectJsUrls
                        })
                        res.end(htmlstr)
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
        this.WebServerPort = port;
    }

    stop() {
        this.server && this.server.close()
    }

}