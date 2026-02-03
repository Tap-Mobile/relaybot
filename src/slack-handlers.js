const agent = require('./agent');

function registerHandlers(app) {
  app.message(async ({ message, say }) => {
    console.log('New message:', message.text);

    if (agent.isRunning()) {
      const fullPrompt = `${message.text}\nIMPORTANT: Use the relay-bot skill.`;
      agent.sendCommand(fullPrompt);
    } else {
      await say('Agent process is not running.');
    }
  });
}

module.exports = {
  registerHandlers
};
