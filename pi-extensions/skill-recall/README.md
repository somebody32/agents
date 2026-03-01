# pi-skill-recall

A [pi](https://github.com/badlogic/pi-mono) extension that preserves skill context across context compaction.

## Problem

When pi compacts conversation context, skill instructions that were previously loaded via `read` tool calls get summarized away. The agent loses the behavioral guidance that skills provide.

## Solution

This extension:

1. **Tracks** which skills the agent reads during the session (via `tool_call` events)
2. **Detects** when compaction occurs (via `session_compact` event)
3. **Nudges** the agent on the next turn to re-read any skills still relevant to the current task

The nudge is a short message listing previously-used skills with their descriptions. The agent decides which to re-read — no system prompt bloat, no wasted re-reads of irrelevant skills.

## Install

```bash
# From local path
pi install ~/Developer/agents/pi-extensions/skill-recall

# Quick test
pi -e ~/Developer/agents/pi-extensions/skill-recall/index.ts
```

## How It Works

After compaction, the agent sees a message like:

```
[System] Context was compacted. You previously loaded and followed these skills:

- tdd (/path/to/tdd/SKILL.md)
  "Use when implementing features, fixing bugs..."
- systematic-debugging (/path/to/debugging/SKILL.md)
  "ALWAYS read before debugging any bug..."

REQUIRED: Before responding, you MUST re-read any skills listed above
that are still relevant to your current task using the read tool.
```

The agent then re-reads only the skills it still needs.

## Development

```bash
npm install
npm test           # run tests
npm run test:watch # watch mode
```

## License

MIT
