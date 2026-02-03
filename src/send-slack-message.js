const { WebClient } = require('@slack/web-api');
const loadConfig = require('./load-config');

const config = loadConfig();

if (!config || !config.SLACK_BOT_TOKEN || !config.SLACK_USER_ID) {
  console.error('❌ Configuration not found. Run: node setup.js');
  process.exit(1);
}

const web = new WebClient(config.SLACK_BOT_TOKEN);
const userId = config.SLACK_USER_ID;

// Get the message from command line arguments
// Convert literal \n to actual newlines
const message = process.argv[2]?.replace(/\\n/g, '\n');

if (!message) {
    console.error('Please provide a message to send.');
    process.exit(1);
}

(async () => {
    try {
        const result = await web.chat.postMessage({
            channel: userId,
            text: message,
        });
        console.log(`Successfully sent message to ${userId}`);
    } catch (error) {
        console.error(`Error sending message: ${error}`);
        process.exit(1);
    }
})();
