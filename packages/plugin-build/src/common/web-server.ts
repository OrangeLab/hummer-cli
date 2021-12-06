import * as http from 'http'
import { EventEmitter } from 'events'
import { Server } from 'http'

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

    constructor(public host: string, public port: number, public staticDir: string) {
        super()
        this.start()
    }

    start() {
        const that = this
        this.server = http.createServer()
        let injectJsNames: Array<any> = []
        request(`http://${this.host}:${this.port}/fileList`, (err: any, res: any, body: any) => {
            if (!err && res.statusCode == 200) {
                injectJsNames = JSON.parse(body).data
                console.log('fyq',injectJsNames)
                injectJsNames.forEach((item, index) => {
                    injectJsNames[index] = item.split('.js')[0]
                });
            }
        });
        this.server.on('request', async function (req, res) {
            await serveHandler(req, res, {
                "public": path.join(rootPath, 'dist'),
            }, {
                sendError() {
                    let defaultPathname
                    const urlObj = url.parse(req.url, true)
                    if (injectJsNames.indexOf('index') >= 0) {
                        defaultPathname = '/index'
                    } else {
                        defaultPathname = `/${injectJsNames[0]}`
                    }
                    const pathName = (urlObj.pathname === '/'||urlObj.pathname === '/favicon.ico') ? defaultPathname : urlObj.pathname
                    let newInjectJsUrls: Array<any> = []
                    newInjectJsUrls[0] = `http://${that.host}:${that.port}${pathName}.js`
                    console.log('fyq',pathName);
                    const filePath = path.join(rootPath, 'dist/index.html')
                    const cssPath = `http://${req.headers.host}/index-browser.css`
                    const jsPath = `http://${req.headers.host}/index-browser.js`
                    fs.readFile(filePath, function (err:any, data:any) {
                        if (err) {
                            console.log(err);
                        }
                        let htmlstr = template.render(data.toString(), {
                            cssPath,
                            jsPath,
                            newInjectJsUrls
                        })
                        console.log('fyq',htmlstr);
                        res.end(htmlstr)
                    })
                }
            })
        })

        this.server.listen({ port: 5002 }, () => {
            console.warn(`Web http server listening , you can connect http server by http://${this.host}:5002/ ...`);
            open(`http://${this.host}:5002/`)
        })
    }


    stop() {
        this.server && this.server.close()
    }

}