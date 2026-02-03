---
name: relay-bot
description: "Workspace-aware assistant that maintains project directory context and sends a Slack DM reply after completing a task or answering a question."
---

# RelayBot

## Overview

Maintain working-directory context for projects and send a Slack DM after tasks or answers using `send-slack-message.js`.

## Working directory

The working directory where the AI operates is configured in `~/.relaybot/config.conf`:

```
WORKING_DIR=/path/to/directory
```

## Workflow

### 1) Resolve project context

- Use the directory configured in `WORKING_DIR` as the working context.
- Run all commands and file operations within this directory.
- Avoid asking the user for clarification; pick the best default and proceed automatically.
- If a question is truly required to continue, send it as a Slack DM using the script, then wait for the user's response via the Slack socket before proceeding.

### 2) Execute the task in the active project

- Run commands and edit files in the resolved working directory.
- Keep the project context for follow-up requests unless the user switches again.

### 3) Send a Slack DM reply after completion

Run from this repo root:

```bash
node ./src/send-slack-message.js "Your message here"
```

## Output rules

- Keep messages concise and actionable
- Include relevant links (PR URLs, documentation, etc.)
- For long answers, summarize key points

## Notes

- The script posts to the configured DM user in `~/.relaybot/config.conf`
- The Slack bot token must be configured in `~/.relaybot/config.conf`
