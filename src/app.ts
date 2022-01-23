import WebSocket from 'ws';
import cron from 'node-cron';
import { Client } from '@elastic/elasticsearch';

require('dotenv').config();

declare var process: {
  env: {
    RUST_WS: string,
    ELASTIC_CONNECT: string,
    SERVERINFO_CRON: string
  }
}

const ws = new WebSocket(process.env.RUST_WS);

const es = new Client({
  node: process.env.ELASTIC_CONNECT,
});

interface RCONMessage {
  Message: string;
  Identifier: number;
  Type?: string;
  Stacktrace?: string,
}

ws.on('message', function message(data) {
  const msg: RCONMessage = JSON.parse(data.toString('utf-8'))
  const now = new Date()

  if (msg.Identifier === 9999999) {
    console.log('> received serverinfo from scheduled ask');

    const telemetry = JSON.parse(msg.Message);

    // hack in metadata to existing object -> elasticsearch document
    telemetry['@timestamp'] = now.toISOString();
    telemetry.EventType = 'serverinfo';

    writeIndex(telemetry);
  } else {
    console.log('> got rcon message', msg.Message);

    // build object -> elasticsearch document
    const telemetry = {
      Message: msg.Message,
      Type: msg.Type,
      Stacktrace: msg.Stacktrace,
      EventType: 'message',
      "@timestamp": now.toISOString(),
    }

    writeIndex(telemetry);
  };
});

console.log('- starting cronjob asking for serverinfo', process.env.SERVERINFO_CRON);
cron.schedule(process.env.SERVERINFO_CRON, function() {
  console.log('< emitting websocket serverinfo');

  const payload: RCONMessage = {
    Message: "serverinfo",
    Identifier: 9999999,
  };

  ws.send(JSON.stringify(payload));
});

function writeIndex(doc: object) {
  // generate the index name based off month-year
  const now: Date = new Date();
  const index: string = `rustmetrics-${now.getMonth()+1}-${now.getFullYear()}`

  es.index({
    index: index,
    body: doc
  }, (err, result) => {
    if (err) console.log(err);
  });
}