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
    return `\nIMPORTANT: Read and follow the instructions in ${skillPath}`;
  }
  return '\nIMPORTANT: Use the relay-bot skill.';
}

function stripBotMention(text, botUserId) {
  if (!text || !botUserId) return text;
  const mentionPrefix = new RegExp(`^<@${botUserId}>\\s*`);
  return text.replace(mentionPrefix, '');
}

function registerHandlers(app) {
  let botUserId = config.SLACK_BOT_USER_ID || null;

  async function resolveBotUserId() {
    if (botUserId) return botUserId;
    try {
      const auth = await app.client.auth.test();
      botUserId = auth.user_id || null;
    } catch (error) {
      console.error('Failed to resolve bot user id:', error);
    }
    return botUserId;
  }

  async function handleMessage({ message, say, text }) {
    // Only respond to messages from the configured user
    if (config.SLACK_USER_ID && message.user !== config.SLACK_USER_ID) {
      return;
    }

    storeLastMessage(message);

    if (agent.isRunning()) {
      const fullPrompt = text + getPromptSuffix();
      agent.sendCommand(fullPrompt);
    } else {
      await say('Agent process is not running.');
    }
  }

  app.event('app_mention', async ({ event, say }) => {
    if (event.channel_type === 'im' || event.channel_type === 'mpim') {
      return;
    }

    const botId = await resolveBotUserId();
    const cleanedText = stripBotMention(event.text, botId);
    await handleMessage({ message: event, say, text: cleanedText });
  });

  app.message(async ({ message, say }) => {
    if (message.channel_type !== 'im') {
      return;
    }

    await handleMessage({ message, say, text: message.text });
  });
}

module.exports = {
  registerHandlers
};
