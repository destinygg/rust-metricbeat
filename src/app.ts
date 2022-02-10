import WebSocket from 'ws';
import cron from 'node-cron';
import { Client } from '@elastic/elasticsearch';

require('dotenv').config();

declare var process: {
  env: {
    RUST_WS: string,
    ELASTIC_CONNECT: string,
    SERVERINFO_CRON: string,
    ENABLE_YVP: string,
  },
  exit: any
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

ws.on('close', function close() {
  console.log('! Websocket closed, crashing out :(');
  process.exit();
});

ws.on('error', function err(err) {
  console.log('! something broke! -', err);
  process.exit();
});

ws.on('message', function message(data) {
  const msg: RCONMessage = JSON.parse(data.toString('utf-8'));
  const now = new Date();

  console.log('> received websocket frame from rcon');

  // sometimes oxide messages throw empty frames so handle them lol !
  if (msg.Message == "") {
    return;
  }

  if (msg.Identifier === 9999999) {
    console.log('> received serverinfo from scheduled ask');

    const telemetry = JSON.parse(msg.Message);

    // hack in metadata to existing object -> elasticsearch document
    telemetry['@timestamp'] = now.toISOString();
    telemetry['EventType'] = 'serverinfo';

    writeIndex(telemetry);
  }  else if (msg.Identifier === 9999998) {
    console.log('> received bouncer.yvpdump from scheduled ask');

    // strip out cringe [Bouncer] from reply lol
    const cringelessJSON: string = msg.Message.replace('[Bouncer]','');
    const pepeVsYeeStats = JSON.parse(cringelessJSON);

    console.log(pepeVsYeeStats);

    // hack in metadata to existing object -> elasticsearch document
    pepeVsYeeStats['@timestamp'] = now.toISOString();
    pepeVsYeeStats['EventType'] = 'bouncer.yvpdump';

    writeIndex(pepeVsYeeStats);

  } else {
    console.log('> got generic rcon message', msg.Message);

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

  if (process.env.ENABLE_YVP === 'true') {
    console.log('< emitting websocket bouncer.yvpdump');
    const customPayload: RCONMessage = {
      Message: "bouncer.yvpdump",
      Identifier: 9999998
    };

    ws.send(JSON.stringify(customPayload));
  };
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