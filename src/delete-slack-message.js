const { WebClient } = require('@slack/web-api');
const loadConfig = require('./load-config');

const config = loadConfig();

if (!config || !config.SLACK_BOT_TOKEN) {
  console.error('❌ Configuration not found. Run: node setup.js');
  process.exit(1);
}

const DEFAULT_LOOKBACK_DAYS = 30;
const token = config.SLACK_BOT_TOKEN;
const web = new WebClient(token);

function usage() {
  console.log('Usage: node delete-slack-message.js <userId> [--bot-user-id <U...>] [--bot-id <B...>] [--app-id <A...>] [--oldest <ts>] [--latest <ts>]');
  console.log('Example: node delete-slack-message.js U02N0ACQG6L --app-id A04MYMXDTA4');
}

function parseArgs(argv) {
  const [, , userId, ...rest] = argv;
  if (!userId) return null;
  const args = { userId };
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!value) continue;
    if (key === '--bot-user-id') args.botUserId = value;
    if (key === '--bot-id') args.botId = value;
    if (key === '--app-id') args.appId = value;
    if (key === '--oldest') args.oldest = value;
    if (key === '--latest') args.latest = value;
  }
  return args;
}

function resolveTimeBounds(oldest, latest) {
  const now = Date.now();
  const oldestMs = oldest ? Math.floor(Number(oldest) * 1000) : now - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const latestMs = latest ? Math.floor(Number(latest) * 1000) : now;
  return {
    oldest: (oldestMs / 1000).toString(),
    latest: (latestMs / 1000).toString()
  };
}

function isMatch(message, botUserId, botId, appId) {
  if (!message) return false;
  if (botUserId && message.user === botUserId) return true;
  if (botId) {
    if (message.bot_id === botId) return true;
    if (message.bot_profile && message.bot_profile.id === botId) return true;
  }
  if (appId) {
    if (message.app_id === appId) return true;
    if (message.bot_profile && message.bot_profile.app_id === appId) return true;
  }
  return false;
}

async function getImChannelId(userId) {
  const result = await web.conversations.open({ users: userId, return_im: true });
  if (!result || !result.channel || !result.channel.id) {
    throw new Error(`Unable to open DM with user ${userId}`);
  }
  return result.channel.id;
}

async function findLatestBotMessage(channelId, botUserId, botId, appId, oldest, latest) {
  let cursor;
  while (true) {
    const result = await web.conversations.history({
      channel: channelId,
      oldest,
      latest,
      limit: 200,
      cursor
    });

    const messages = result.messages || [];
    for (const message of messages) {
      if (isMatch(message, botUserId, botId, appId)) {
        return message;
      }
    }

    const nextCursor = result.response_metadata ? result.response_metadata.next_cursor : null;
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    usage();
    process.exit(1);
  }

  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not set in config.conf');
  }

  if (!args.botUserId && !args.botId && !args.appId) {
    const auth = await web.auth.test();
    if (auth && auth.user_id) {
      args.botUserId = auth.user_id;
    }
    if (auth && auth.bot_id) {
      args.botId = auth.bot_id;
    }
    if (!args.botUserId && !args.botId && !args.appId) {
      throw new Error('Missing identifiers. Provide --bot-user-id, --bot-id, or --app-id.');
    }
  }

  const { oldest, latest } = resolveTimeBounds(args.oldest, args.latest);
  const channelId = await getImChannelId(args.userId);
  const message = await findLatestBotMessage(channelId, args.botUserId, args.botId, args.appId, oldest, latest);

  if (!message) {
    console.log(`No message found for bot ${args.botId} in DM with ${args.userId}.`);
    return;
  }

  console.log(`Found message ${message.ts} in channel ${channelId}.`);

  await web.chat.delete({ channel: channelId, ts: message.ts });
  console.log(`Deleted message ${message.ts} in channel ${channelId}.`);
}

main().catch(error => {
  console.error(`Failed to delete message: ${error.message}`);
  process.exit(1);
});
