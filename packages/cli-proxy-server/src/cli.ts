#!/usr/bin/env node
import yargs from 'yargs'
import { runProxyServer } from './index'

const argv = yargs
  .option('port', {
    alias: 'p',
    describe: 'port to run inspector proxy on',
    type: 'number',
    default: 8080,
  }).argv;

runProxyServer(argv.port)

