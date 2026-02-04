const pty = require('@lydell/node-pty');

let claudeProcess = null;
const useCodex = process.argv.includes('--codex');
const noYolo = process.argv.includes('--noyolo');
const shell = useCodex ? 'codex' : 'claude';

function sendCommand(text) {
  if (claudeProcess) {
    setTimeout(() => {
      claudeProcess.write(text + '\r\n');
      claudeProcess.write('\x0D');
    }, 500);
  }
}

function isRunning() {
  return claudeProcess !== null;
}

function start() {
  const defaultArgs = useCodex ? ['--yolo'] : ['--dangerously-skip-permissions'];
  const spawnArgs = noYolo ? [] : defaultArgs;
  claudeProcess = pty.spawn(shell, spawnArgs, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: { ...process.env, TERM: process.env.TERM || 'xterm-256color' }
  });

  console.log(`--- Persistent ${useCodex ? 'Codex' : 'Claude'} Session Started ---`);

  claudeProcess.onData((data) => {
    const dataStr = data.toString();
    const byPassPrompts = ['Do you want to proceed?'];
    if (byPassPrompts.some((prompt) => dataStr.includes(prompt))) {
      setTimeout(() => {
        claudeProcess.write('\r\n');
        claudeProcess.write('\x0D');
      }, 500);
    }

    // Respond to cursor position queries from Codex to avoid CPR timeouts.
    if (data.includes('\x1b[6n')) {
      const occurrences = data.split('\x1b[6n').length - 1;
      for (let i = 0; i < occurrences; i += 1) {
        claudeProcess.write('\x1b[1;1R');
      }
      data = data.replace(/\x1b\[6n/g, '');
    }
    process.stdout.write(data);
  });

  return claudeProcess;
}

module.exports = {
  sendCommand,
  isRunning,
  start
};
