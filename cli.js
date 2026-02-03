#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🤖 RelayBot - Slack-to-AI gateway

Usage: relaybot <command>

Commands:
  setup    Configure Slack credentials and working directory
  start    Start the RelayBot server

Examples:
  relaybot setup    # Run interactive setup
  relaybot start    # Start the bot
`);
}

switch (command) {
  case 'setup':
    require('./setup');
    break;
  case 'start':
    require('./main');
    break;
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}
