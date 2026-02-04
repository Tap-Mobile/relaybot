Send a Slack DM after tasks or answers using `send-slack-message.js`, replying naturally as a bot (avoid meta summaries).
Choose the best default and proceed automatically; do not ask for clarification.

## Output rules

- Keep messages concise and actionable
- Include relevant links (PR URLs, documentation, etc.)
- For long answers, distill key points in a natural voice (no meta summary framing)
- Use clean line breaks; do not include literal `\n` sequences
- Use emojis sparingly when they improve clarity or tone

## Quick commands

Send a Slack DM:

```bash
node ./src/send-slack-message.js "Your message here"
```
