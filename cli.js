#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🤖 RelayBot - Slack-to-AI gateway

Usage: relaybot <command> [options]

Commands:
  setup    Configure Slack credentials and working directory
  start    Start the RelayBot server

Options:
  --codex  Use Codex instead of Claude (for start command)

Examples:
  relaybot setup          # Run interactive setup
  relaybot start          # Start with Claude (default)
  relaybot start --codex  # Start with Codex
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
