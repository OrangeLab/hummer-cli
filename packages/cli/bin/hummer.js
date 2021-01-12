#!/usr/bin/env node
'use strict'
const path = require('path')
const {initCliConfig} = require('@hummer/cli-utils')
const cliPackage = require('../package.json')

async function start(){
  const {HummerCli} = require('../dist/index')
  const cli = new HummerCli(process.argv)
  await cli.init()
  await cli.run()
}

function initConfig(){
  initCliConfig({
    root: path.join(__dirname, '..'),
    ...cliPackage
  });  
}
initConfig();
start();



