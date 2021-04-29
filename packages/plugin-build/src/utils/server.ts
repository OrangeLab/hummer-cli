import * as portfinder from 'portfinder';
import * as address from 'address';
interface ServerConfig{
  protocol?: string,
  host: string,
  port: number
}
const serverConfig:ServerConfig = {
  protocol: 'http',
  host: getHost(),
  port: 8000
}
/** 初始化正确的端口 */
initServerConfig();

export function getPort() {
  return portfinder.getPortPromise();
}

export function getHost() {
  return address.ip();
}


export async function getServerConfig(){
  return serverConfig
}

export function getAssetsAddress(){
  return `http://${serverConfig.host}:${serverConfig.port}/`
}

function initServerConfig(){
  (async () => {
    let port = await getPort();
    serverConfig.port = port; 
  })()
}
