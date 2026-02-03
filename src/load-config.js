const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.relaybot');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.conf');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }

  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return config;
}

module.exports = loadConfig;
module.exports.CONFIG_DIR = CONFIG_DIR;
module.exports.CONFIG_PATH = CONFIG_PATH;
