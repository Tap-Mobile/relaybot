#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_DIR = path.join(os.homedir(), '.relaybot');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.conf');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function setup() {
  console.log('\n🤖 RelayBot Setup\n');
  console.log('Please provide your Slack credentials.\n');

  const botToken = await question('SLACK_BOT_TOKEN (xoxb-...): ');
  const appToken = await question('SLACK_APP_TOKEN (xapp-...): ');
  const userId = await question('SLACK_USER_ID (U0XXXXXXXX): ');

  console.log('\nWorking directory (folder where the AI will operate).\n');
  const workingDir = await question('WORKING_DIR: ');

  const configLines = [
    `SLACK_BOT_TOKEN=${botToken.trim()}`,
    `SLACK_APP_TOKEN=${appToken.trim()}`,
    `SLACK_USER_ID=${userId.trim()}`,
    `WORKING_DIR=${workingDir.trim()}`
  ];

  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, configLines.join('\n') + '\n');
  console.log(`\n✅ Configuration saved to ${CONFIG_PATH}\n`);

  rl.close();
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  rl.close();
  process.exit(1);
});
