const pty = require('@lydell/node-pty');

let claudeProcess = null;
let startTime = null;
let lastExit = null;
let stdinHandler = null;
let stdinAttached = false;
let rawModeBefore = null;
let useCodex = process.argv.includes('--codex');
let noYolo = process.argv.includes('--noyolo');
let shell = useCodex ? 'codex' : 'claude';

function sendCommand(text) {
  if (claudeProcess) {
    setTimeout(() => {
      claudeProcess.write(text + '\r');
      setTimeout(() => {
        claudeProcess.write('\r');
        claudeProcess.write('\x0D');
      }, 500);
    }, 500);
  }
}

function isRunning() {
  return claudeProcess !== null;
}

function attachStdin() {
  if (stdinAttached) return;

  rawModeBefore = Boolean(process.stdin.isTTY && process.stdin.isRaw);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  stdinHandler = (data) => {
    if (data && data.length === 1 && data[0] === 3) {
      // Ctrl+C: restore terminal and exit.
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(Boolean(rawModeBefore));
      }
      if (claudeProcess) {
        claudeProcess.kill('SIGINT');
      }
      process.exit(0);
    }
    if (claudeProcess) {
      claudeProcess.write(data);
    }
  };

  process.stdin.on('data', stdinHandler);
  stdinAttached = true;
}

function detachStdin() {
  if (!stdinAttached) return;
  process.stdin.off('data', stdinHandler);
  stdinHandler = null;
  stdinAttached = false;
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(Boolean(rawModeBefore));
  }
}

function start(options = {}) {
  if (claudeProcess) {
    return claudeProcess;
  }

  if (typeof options.useCodex === 'boolean') {
    useCodex = options.useCodex;
  }
  if (typeof options.noYolo === 'boolean') {
    noYolo = options.noYolo;
  }
  shell = useCodex ? 'codex' : 'claude';

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
  startTime = new Date();

  attachStdin();

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

  claudeProcess.onExit(({ exitCode, signal }) => {
    lastExit = {
      exitCode,
      signal,
      at: new Date()
    };
    claudeProcess = null;
    startTime = null;
    detachStdin();
  });

  return claudeProcess;
}

function stop() {
  if (!claudeProcess) {
    return { stopped: false, reason: 'not_running' };
  }

  try {
    claudeProcess.write('\x03');
    setTimeout(() => {
      if (claudeProcess) {
        claudeProcess.kill('SIGINT');
      }
    }, 250);
  } catch (error) {
    return { stopped: false, reason: 'error', error };
  }

  return { stopped: true };
}

function getStatus() {
  const now = Date.now();
  const uptimeSeconds = startTime ? Math.floor((now - startTime.getTime()) / 1000) : null;
  return {
    running: Boolean(claudeProcess),
    shell,
    pid: claudeProcess ? claudeProcess.pid : null,
    startedAt: startTime ? startTime.toISOString() : null,
    uptimeSeconds,
    noYolo,
    useCodex,
    cwd: process.cwd(),
    lastExit
  };
}

module.exports = {
  sendCommand,
  isRunning,
  start,
  stop,
  getStatus
};
