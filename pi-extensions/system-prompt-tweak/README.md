# pi-system-prompt-tweak

A tiny [pi](https://github.com/badlogic/pi-mono) extension that rewrites one specific system-prompt line for Anthropic models.

## What it does

On `before_agent_start`, the extension checks whether the effective system prompt contains this line:

```text
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
```

If present, it replaces it with:

```text
- When working on pi topics, read the docs and examples, and follow relevant linked docs before implementing
```

The tweak is only applied when the selected model provider is `anthropic`.

## Install

```bash
pi install ~/Developer/agents/pi-extensions/system-prompt-tweak
```

## Quick test

```bash
pi -e ~/Developer/agents/pi-extensions/system-prompt-tweak/index.ts
```
