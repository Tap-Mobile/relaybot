const fs = require('fs');
const path = require('path');
const agent = require('./agent');
const loadConfig = require('./load-config');

const config = loadConfig();
const isProduction = __dirname.includes('node_modules');
const skillPath = path.join(__dirname, '..', 'skills', 'relay-bot', 'SKILL.md');
const lastMessagePath = path.join(loadConfig.CONFIG_DIR, 'last_message.json');

function storeLastMessage(message) {
  try {
    const payload = {
      channel: message.channel,
      user: message.user,
      ts: message.ts
    };
    fs.mkdirSync(loadConfig.CONFIG_DIR, { recursive: true });
    fs.writeFileSync(lastMessagePath, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to store last message:', error);
  }
}

function getPromptSuffix() {
  if (isProduction) {
    return `\nIMPORTANT: Use the relay-bot skill if it exists. Otherwise, read and follow the instructions in ${skillPath}`;
  }
  return '\nIMPORTANT: Use the relay-bot skill.';
}

function registerHandlers(app) {
  app.message(async ({ message, say }) => {
    // Only respond to messages from the configured user
    if (config.SLACK_USER_ID && message.user !== config.SLACK_USER_ID) {
      return;
    }

    storeLastMessage(message);

    if (agent.isRunning()) {
      const fullPrompt = message.text + getPromptSuffix();
      agent.sendCommand(fullPrompt);
    } else {
      await say('Agent process is not running.');
    }
  });
}

module.exports = {
  registerHandlers
};
