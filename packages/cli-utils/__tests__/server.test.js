const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8080');

ws.on('open', function open() {
  let log = {
    type: 'log',
    data: {
       level: 1, // Log Level：log 1, debug 2, info 3, warn 4, error 5
       message: 'Log Message' // Log Message
    }
  }
  ws.send(JSON.stringify(log))
});

ws.on('message', function incoming(data) {
  console.log(data);
});
