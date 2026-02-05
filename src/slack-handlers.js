const fs = require('fs');
const path = require('path');
const agent = require('./agent');
const loadConfig = require('./load-config');

const config = loadConfig();
const isProduction = __dirname.includes('node_modules');
const skillPath = path.join(__dirname, '..', 'guide.md');
const lastMessagePath = path.join(loadConfig.CONFIG_DIR, 'last_message.json');

function storeLastMessage(message) {
  try {
    const payload = {
      channel: message.channel,
      user: message.user,
      ts: message.ts,
      thread_ts: message.thread_ts || message.ts
    };
    fs.mkdirSync(loadConfig.CONFIG_DIR, { recursive: true });
    fs.writeFileSync(lastMessagePath, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to store last message:', error);
  }
}

function getPromptSuffix() {
  return `\nIMPORTANT: Read and follow the instructions in ${skillPath}`;
}

function stripMentions(text) {
  if (!text) return text;
  return text.replace(/<@[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function updateConfigValue(key, value) {
  fs.mkdirSync(loadConfig.CONFIG_DIR, { recursive: true });
  let lines = [];
  if (fs.existsSync(loadConfig.CONFIG_PATH)) {
    const content = fs.readFileSync(loadConfig.CONFIG_PATH, 'utf-8');
    lines = content.split('\n');
  }

  let updated = false;
  lines = lines.map((line) => {
    if (line.trim().startsWith('#') || !line.includes('=')) {
      return line;
    }
    const [k] = line.split('=');
    if (k.trim() === key) {
      updated = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!updated) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(loadConfig.CONFIG_PATH, lines.join('\n'));
}

function parseCommandOptions(text) {
  const parts = (text || '').trim().split(/\s+/);
  const options = {
    useCodex: parts.includes('--codex'),
    noYolo: parts.includes('--noyolo')
  };
  return options;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function registerHandlers(app) {
  async function handleMessage({ message, say, text }) {
    // Only respond to messages from the configured user
    if (config.SLACK_USER_ID && message.user !== config.SLACK_USER_ID) {
      return;
    }

    storeLastMessage(message);

    // Prepare say function with thread_ts support
    const threadTs = message.thread_ts || message.ts;
    const sayInThread = (msg) => say({ text: msg, thread_ts: threadTs });

    const trimmedText = (text || '').trim();
    if (trimmedText === '$stop') {
      const result = agent.stop();
      if (result.stopped) {
        await sayInThread('Stopped the agent session (SIGINT).');
      } else if (result.reason === 'not_running') {
        await sayInThread('Agent is not running.');
      } else {
        await sayInThread('Failed to stop the agent session.');
      }
      return;
    }

    if (trimmedText.startsWith('$start')) {
      const options = parseCommandOptions(trimmedText);
      if (agent.isRunning()) {
        await sayInThread('Agent is already running.');
      } else {
        agent.start(options);
        await sayInThread(`Started the agent session${options.useCodex ? ' (Codex)' : ' (Claude)'}${options.noYolo ? ' without auto-approve flags' : ''}.`);
      }
      return;
    }

    if (trimmedText.startsWith('$restart')) {
      const options = parseCommandOptions(trimmedText);
      if (agent.isRunning()) {
        agent.stop();
        await delay(400);
      }
      agent.start(options);
      await sayInThread(`Restarted the agent session${options.useCodex ? ' (Codex)' : ' (Claude)'}${options.noYolo ? ' without auto-approve flags' : ''}.`);
      return;
    }

    if (trimmedText === '$status') {
      const status = agent.getStatus();
      const lines = [
        `Running: ${status.running}`,
        `Shell: ${status.shell}`,
        `PID: ${status.pid || 'n/a'}`,
        `Started: ${status.startedAt || 'n/a'}`,
        `Uptime (s): ${status.uptimeSeconds || 'n/a'}`,
        `CWD: ${status.cwd}`,
        `Configured WORKING_DIR: ${config.WORKING_DIR || 'n/a'}`,
        `Use Codex: ${status.useCodex}`,
        `No YOLO: ${status.noYolo}`
      ];
      if (status.lastExit) {
        lines.push(`Last exit: code=${status.lastExit.exitCode ?? 'n/a'} signal=${status.lastExit.signal || 'n/a'} at=${status.lastExit.at.toISOString()}`);
      }
      await sayInThread(lines.join('\n'));
      return;
    }

    if (trimmedText.startsWith('$dir ')) {
      const newDir = trimmedText.replace(/^\$dir\s+/, '').trim();
      if (!newDir) {
        await sayInThread('Usage: $dir /path/to/working/dir');
        return;
      }
      if (!fs.existsSync(newDir)) {
        await sayInThread(`Directory does not exist: ${newDir}`);
        return;
      }
      const stat = fs.statSync(newDir);
      if (!stat.isDirectory()) {
        await sayInThread(`Not a directory: ${newDir}`);
        return;
      }
      updateConfigValue('WORKING_DIR', newDir);
      config.WORKING_DIR = newDir;
      await sayInThread(`Working directory set to: ${newDir}`);
      return;
    }

    if (agent.isRunning()) {
      const fullPrompt = trimmedText + getPromptSuffix();
      agent.sendCommand(fullPrompt);
    } else {
      await sayInThread('Agent process is not running.');
    }
  }

  app.event('app_mention', async ({ event, say }) => {
    if (event.channel_type === 'im' || event.channel_type === 'mpim') {
      return;
    }

    const cleanedText = stripMentions(event.text);
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
