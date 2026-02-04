# RelayBot

An AI assistant that lives in your Slack channels and DMs — powered by Claude or Codex.

<img src="demo/demo.jpg" width="30%">

---

## What is RelayBot?

RelayBot acts as a bridge between Slack and AI coding agents, allowing you to interact with Claude or Codex by mentioning the bot in channels or sending a DM. Instead of switching between tools, you can request code changes, ask questions, and manage development tasks without leaving Slack.

### Key Features

- **Conversational AI Access** — Chat with Claude or Codex from Slack channels via mentions or via DM
- **Code Execution** — AI can read, write, and modify code in your projects
- **Task Automation** — Request file changes, refactoring, bug fixes, or new features
- **Context-Aware Responses** — Maintains project directory context across conversations
- **Summarized Replies** — Long AI outputs are condensed into concise, actionable messages
- **Persistent Sessions** — AI session stays alive between messages, preserving context

### Use Cases

- **Quick Code Changes** — "Add a loading spinner to the login button"
- **Code Review** — "Review the latest PR and suggest improvements"
- **Bug Investigation** — "Why is the checkout flow failing for guest users?"
- **Refactoring** — "Refactor the authentication module to use async/await"
- **Documentation** — "Generate API docs for the user service"
- **Learning** — "Explain how the caching layer works in this codebase"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SLACK                                     │
│  ┌──────────┐                                    ┌──────────────┐   │
│  │   User   │ ───── sends message ─────────────► │   Channel/   │   │
│  │          │ ◄──── receives reply ───────────── │   Channel   │   │
│  └──────────┘                                    └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │ ▲
                              │ │
              Slack WebSocket │ │ Slack Sender
              (Socket Mode)   │ │
                              ▼ │
┌─────────────────────────────────────────────────────────────────────┐
│                            RELAYBOT                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Slack Listener                              │ │
│  │                  (Socket Mode Connection)                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              │ forwards message                     │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     PTY Bridge                                 │ │
│  │              Spawns persistent AI CLI process                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ stdin/stdout
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLAUDE / CODEX CLI                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    AI Agent Session                            │ │
│  │         • Processes user requests                              │ │
│  │         • Executes tasks (code, commands, etc.)                │ │
│  │         • Maintains project context                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              │ summarizes response                  │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   Response Summarizer                          │ │
│  │      • Condenses long outputs to concise messages              │ │
│  │      • Includes relevant links (PRs, docs, etc.)               │ │
│  │      • Sends reply back to Slack                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Slack Connection** — RelayBot connects to Slack via WebSocket (Socket Mode) and listens for mentions and DMs
2. **Message Reception** — When you send a message, Slack forwards it to RelayBot
3. **AI Bridge** — RelayBot spawns a persistent Claude or Codex CLI session and forwards your message
4. **AI Processing** — The AI processes your request with full access to your codebase
5. **Response Summarization** — Long outputs are summarized into concise, actionable messages
6. **Slack Reply** — The summarized response is sent back to the same channel or DM

---

## Slack Commands

Send these as a DM to the bot (or in a channel mention) to control the agent session:

- `$status` — Show whether the agent is running, plus PID, start time, uptime, cwd, WORKING_DIR, and last exit
- `$stop` — Stop the agent session (equivalent to Ctrl-C)
- `$start [--codex] [--noyolo]` — Start the agent with optional flags
- `$restart [--codex] [--noyolo]` — Restart the agent with optional flags
- `$dir /path/to/working/dir` — Update the configured working directory (must exist).

Examples:

```
$status
$stop
$start --codex
$restart --noyolo
$dir /Users/you/work/project
```

---

## Installation

### Option 1: Install via npm (Recommended)

```bash
npm install -g relaybot
```

Then run:

```bash
# Configure Slack credentials
relaybot setup

# Start the bot (Claude by default)
relaybot start

# Start the bot with Codex
relaybot start --codex

# Start the bot without auto-approve flags
relaybot start --noyolo
```

### Option 2: Run from Source

```bash
# Clone the repository
git clone https://github.com/dinhquan/relaybot.git
cd relaybot

# Install dependencies
npm install

# Configure Slack credentials
npm run setup

# Start the bot (Claude by default)
npm start

# Start the bot with Codex
node main.js --codex

# Start the bot without auto-approve flags
node main.js --noyolo

`--noyolo` disables passing `--yolo` (Codex) or `--dangerously-skip-permissions` (Claude) to the underlying CLI.
```

---

## Setup

Before running the bot, you need to configure your Slack credentials.

### Interactive Setup

Run the setup command and follow the prompts:

```bash
# If installed globally
relaybot setup

# If running from source
npm run setup
```

You will be asked for:
- **SLACK_BOT_TOKEN** - Bot User OAuth Token (starts with `xoxb-`)
- **SLACK_APP_TOKEN** - App-Level Token (starts with `xapp-`)
- **SLACK_USER_ID** (optional) - Your Slack User ID (starts with `U`). Provide this to prevent the bot from replying to other users.
- **WORKING_DIR** (optional) - Directory where the AI will operate. Set this to give the bot better context about where to work.

### Manual Setup

Alternatively, create the config file manually at `~/.relaybot/config.conf`:

```bash
mkdir -p ~/.relaybot
```

Then create `~/.relaybot/config.conf`:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_USER_ID=U0XXXXXXXX
WORKING_DIR=/path/to/directory
```

### Creating a Slack App

If you don't have a Slack app yet, follow these steps:

#### 1. Create the App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From a manifest** (recommended) and paste the contents of `manifest.json` from this repo, then skip to step 5
4. Or choose **From scratch** to configure manually (continue with steps below)
3. Choose **From scratch**
4. Enter an app name (e.g., "RelayBot") and select your workspace
5. Click **Create App**

#### 2. Enable Socket Mode

Socket Mode allows the bot to receive events via WebSocket instead of HTTP endpoints.

1. Go to **Socket Mode** in the left sidebar
2. Toggle **Enable Socket Mode** to ON
3. You'll be prompted to create an App-Level Token:
   - Token Name: `socket-token` (or any name)
   - Scope: `connections:write`
   - Click **Generate**
4. Copy the token (starts with `xapp-`) — this is your **SLACK_APP_TOKEN**

#### 3. Configure Bot Permissions

1. Go to **OAuth & Permissions** in the left sidebar
2. Scroll to **Scopes** → **Bot Token Scopes**
3. Add these scopes:
   - `chat:write` — Send messages
   - `app_mentions:read` — Read mentions of your app
   - `im:history` — Read DM history
   - `im:read` — View DM metadata
   - `im:write` — Start DMs with users
   - `users:read` — View user info

#### 4. Enable Event Subscriptions

1. Go to **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** to ON
3. Expand **Subscribe to bot events**
4. Add these events:
   - `app_mention` — Receive mentions in channels
   - `message.im` — Receive DM messages

#### 5. Install the App

1. Go to **Install App** in the left sidebar
2. Click **Install to Workspace**
3. Review permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`) — this is your **SLACK_BOT_TOKEN**

#### 6. Get Your User ID

1. Open Slack
2. Click on your profile picture → **Profile**
3. Click the **⋮** (more) button
4. Click **Copy member ID** — this is your **SLACK_USER_ID**

### Summary of Tokens

| Token | Where to Find | Format |
|-------|---------------|--------|
| `SLACK_BOT_TOKEN` | OAuth & Permissions → Bot User OAuth Token | `xoxb-...` |
| `SLACK_APP_TOKEN` | Basic Information → App-Level Tokens | `xapp-...` |
| `SLACK_USER_ID` | Slack Profile → Copy member ID | `U0XXXXXXXX` (optional) |

---

## Requirements

- **Node.js** v14+
- **Claude CLI** or **Codex CLI** available on PATH

---

## Configuration

Configuration is stored in `~/.relaybot/config.conf`.

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token (`xoxb-...`) |
| `SLACK_APP_TOKEN` | Slack App-level token for Socket Mode (`xapp-...`) |
| `SLACK_USER_ID` | Optional. Restricts replies to a single user (`U0XXXXXXXX`) |
| `WORKING_DIR` | Optional. Directory where the AI will operate for better context |
