const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const path = require('path');
const loadConfig = require('./load-config');

const config = loadConfig();

if (!config || !config.SLACK_BOT_TOKEN) {
  console.error('❌ Configuration not found. Run: node setup.js');
  process.exit(1);
}

const web = new WebClient(config.SLACK_BOT_TOKEN);
const lastMessagePath = path.join(loadConfig.CONFIG_DIR, 'last_message.json');

function getLastChannel() {
  try {
    if (!fs.existsSync(lastMessagePath)) {
      return null;
    }
    const payload = JSON.parse(fs.readFileSync(lastMessagePath, 'utf-8'));
    return payload?.channel || null;
  } catch (error) {
    console.error('Failed to read last message:', error);
    return null;
  }
}
const channelId = getLastChannel() || config.SLACK_USER_ID;

// Get the message from command line arguments
// Convert literal \n to actual newlines
const message = process.argv[2]?.replace(/\\n/g, '\n');

if (!message) {
    console.error('Please provide a message to send.');
    process.exit(1);
}

(async () => {
    try {
        if (!channelId) {
            console.error('No recent channel found and SLACK_USER_ID is not set.');
            console.error('Send a Slack message to the bot first or set SLACK_USER_ID in the config.');
            process.exit(1);
        }
        const result = await web.chat.postMessage({
            channel: channelId,
            text: message,
        });
        console.log(`Successfully sent message to ${channelId}`);
    } catch (error) {
        console.error(`Error sending message: ${error}`);
        process.exit(1);
    }
})();
