FROM node:16-buster-slim

WORKDIR /rust-metricbeat

COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .

RUN yarn install --production

COPY src/app.ts /rust-metricbeat/src/app.ts

CMD [ "yarn","start" ]