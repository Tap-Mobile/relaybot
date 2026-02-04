#!/usr/bin/env node

const { App } = require('@slack/bolt');
const loadConfig = require('./src/load-config');
const agent = require('./src/agent');
const slackHandlers = require('./src/slack-handlers');

const config = loadConfig();

if (!config || !config.SLACK_BOT_TOKEN || !config.SLACK_APP_TOKEN) {
  console.error('❌ Configuration not found or incomplete.\n');
  console.log('Please run setup first:\n');
  console.log('  relaybot setup\n');
  process.exit(1);
}

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
  socketMode: true
});

slackHandlers.registerHandlers(app);

(async () => {
  await app.start();
  console.log('⚡️ RelayBot running (Socket Mode)');
  agent.start();
})();
