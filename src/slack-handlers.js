const path = require('path');
const agent = require('./agent');

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
