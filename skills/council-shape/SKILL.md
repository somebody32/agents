---
name: council-shape
description: Shape a task before implementation, then pressure-test the proposed shape with a council made of a Codex subagent on gpt-5.6 with high reasoning and pi/fable via the pi CLI. Use when the user asks to shape, plan, design, scope, or pressure-test non-trivial work with council feedback before deciding what to implement.
---

# Council Shape

## Overview

Shape the task first, then use council feedback as adversarial input. The council may be wrong or missing context, so verify its claims against the real task context before changing the recommendation.

## Workflow

1. Gather enough source context to shape the task responsibly: current behavior, constraints, relevant files/docs, prior decisions, and known unknowns.
2. Draft a concise shape before asking the council. Include the goal, non-goals, proposed approach, alternatives rejected, risks, validation plan, and open questions.
3. Ask both council members after the initial shape exists:
   - Codex: start a subagent configured for model `gpt-5.6` with `high` reasoning. Ask it to critique the shape, find missing context, identify simpler alternatives, and call out implementation or validation risks.
   - pi/fable: run `pi -p --approve --session /tmp/<session_name>.jsonl --model anthropic/claude-fable-5 --thinking high "prompt"`.
4. Never use fast mode for council shaping unless the user explicitly asks for fast mode.
5. Use one stable `/tmp/<session_name>.jsonl` per task for pi/fable so follow-ups stay in the same council session.
6. Compare council feedback against the source context. Accept feedback only when it is supported by evidence or exposes a real uncertainty. Reject or qualify feedback that depends on false assumptions, stale context, or invented constraints.
7. Use back-and-forth in the same pi/fable session, and with the Codex subagent when practical, to resolve important disagreement. Either convince the council with concrete evidence or update the shape.
8. Stop iterating when blockers are resolved, remaining disagreement is explicitly documented, or further council turns are unlikely to change the decision.

## Council Prompt

Use a direct prompt with enough task-local context for independent critique:

```text
I am shaping this task before implementation.

Task:
<user request>

Relevant context:
<files, docs, behavior, constraints, evidence>

Proposed shape:
<goal, non-goals, approach, validation, risks>

Please critique this shape. Focus on missing context, hidden assumptions, simpler options, bad boundaries, implementation risks, and validation gaps. Be concrete and cite which claim depends on which evidence.
```

For pi/fable, choose a readable session name such as `council-shape-<short-task-slug>`:

```bash
pi -p --approve --session /tmp/<session_name>.jsonl --model anthropic/claude-fable-5 --thinking high "prompt"
```

For follow-up turns, reuse the same session path:

```bash
pi -p --approve --session /tmp/<session_name>.jsonl --model anthropic/claude-fable-5 --thinking high "follow-up prompt"
```

## Handling Feedback

- Treat council output as advisory, not authoritative.
- Check factual claims against the repo, docs, logs, traces, or other primary evidence before relying on them.
- If council identifies a real flaw, revise the shape and say what changed.
- If council is wrong, respond with the missing evidence and ask whether the objection still stands.
- If disagreement remains, state the disagreement and why the final recommendation chooses one side.

## Final Output

Return the final shaped task with:

- Recommended shape
- Council feedback that changed the shape
- Council feedback rejected or left unresolved, with reasons
- Validation plan or next implementation slice
