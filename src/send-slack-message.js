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

function getLastChannelInfo() {
  try {
    if (!fs.existsSync(lastMessagePath)) {
      return null;
    }
    const payload = JSON.parse(fs.readFileSync(lastMessagePath, 'utf-8'));
    return {
      channel: payload?.channel || null,
      thread_ts: payload?.thread_ts || null
    };
  } catch (error) {
    console.error('Failed to read last message:', error);
    return null;
  }
}
const channelInfo = getLastChannelInfo();
const channelId = channelInfo?.channel || config.SLACK_USER_ID;
const threadTs = channelInfo?.thread_ts || null;

function parseArgs() {
  const args = process.argv.slice(2);
  const useStdin = args.includes('--stdin');
  const filtered = args.filter((arg) => arg !== '--stdin');
  const argMessage = filtered.join(' ');
  return { useStdin, argMessage };
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function chunkMessage(text, maxLen) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const chunks = [];
  let remaining = normalized;
  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    let idx = slice.lastIndexOf('\n\n');
    if (idx < maxLen * 0.5) idx = slice.lastIndexOf('\n');
    if (idx < maxLen * 0.5) idx = slice.lastIndexOf(' ');
    if (idx < 1) idx = maxLen;
    const piece = remaining.slice(0, idx).trimEnd();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(idx).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

(async () => {
  try {
    if (!channelId) {
      console.error('No recent channel found and SLACK_USER_ID is not set.');
      console.error('Send a Slack message to the bot first or set SLACK_USER_ID in the config.');
      process.exit(1);
    }

    const { useStdin, argMessage } = parseArgs();
    let message = argMessage.replace(/\\n/g, '\n');
    if (useStdin || !message) {
      const stdinMessage = await readStdin();
      if (stdinMessage) {
        message = stdinMessage;
      }
    }

    if (!message || !message.trim()) {
      console.error('Please provide a message to send.');
      console.error('Usage: node ./src/send-slack-message.js "Your message here"');
      console.error('Or: cat message.txt | node ./src/send-slack-message.js --stdin');
      process.exit(1);
    }

    const chunks = chunkMessage(message, 39000);
    for (const chunk of chunks) {
      const messageOptions = {
        channel: channelId,
        text: chunk,
      };
      if (threadTs) {
        messageOptions.thread_ts = threadTs;
      }
      await web.chat.postMessage(messageOptions);
    }
    console.log(`Successfully sent ${chunks.length} message(s) to ${channelId}${threadTs ? ' (in thread)' : ''}`);
  } catch (error) {
    const apiError = error?.data?.error ? ` (${error.data.error})` : '';
    console.error(`Error sending message: ${error}${apiError}`);
    process.exit(1);
  }
})();
