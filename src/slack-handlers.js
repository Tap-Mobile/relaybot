const path = require('path');
const agent = require('./agent');
const loadConfig = require('./load-config');

const config = loadConfig();
const isProduction = __dirname.includes('node_modules');
const skillPath = path.join(__dirname, '..', 'skills', 'relay-bot', 'SKILL.md');

function getPromptSuffix() {
  if (isProduction) {
    return `\nIMPORTANT: Read and follow the instructions in ${skillPath}`;
  }
  return '\nIMPORTANT: Use the relay-bot skill.';
}

function registerHandlers(app) {
  app.message(async ({ message, say }) => {
    // Only respond to messages from the configured user
    if (message.user !== config.SLACK_USER_ID) {
      return;
    }

    console.log('New message:', message.text);

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
