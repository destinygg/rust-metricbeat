# rust-metricbeat

A TypeScript RCON telemetry agent for RustDedicated, the Rust (video game) multiplayer server.

Connects to the RCON WebSocket of your Rust server, writes console output to ElasticSearch and routinely polls for server status, useful for time-series graphing of server behavior.

## ElasticSearch

As built supports direct or basic auth ElasticSearch. Follow Docs: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/master/client-connecting.html#auth-basic

Do not put your ElasticSearch server on the internet, use a reverse proxy + HTTP basic auth.

Creates an index in the pattern of `rustmetrics-[month]-[year]`

## RCON

Rust uses WebSockets for RCON, I am lazy so you have to build your own connection string as `RUST_WS` as follows

```
ws://[ip]:[port]/[password]

ws://10.10.10.10:28016/verysecurepassword
```

## CRON

Uses `node-cron` to schedule telemetry polling, Configurable syntax docs: https://github.com/node-cron/node-cron#cron-syntax

## Running

1. copy .env.example .env
2. update .env
3. docker-compose up -d
