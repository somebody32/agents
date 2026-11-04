---
name: council-shape
description: Shape a task before implementation, then pressure-test the proposed shape with a council made of a Codex subagent on gpt-6.1-sol, Claude Fable 5.1, and Claude Opus 5.5, all with xhigh reasoning; run the Claude members via the claude CLI. Use when the user asks to shape, plan, design, scope, or pressure-test non-trivial work with council feedback before deciding what to implement.
---

# Council Shape

## Overview

Shape the task first, then use council feedback as adversarial input. The council may be wrong or missing context, so verify its claims against the real task context before changing the recommendation.

## Council Size

Use exactly three council members: one Codex subagent, one Claude/Fable agent, and one Claude/Opus agent. Never create additional council agents or let any member delegate to more agents. This limit applies regardless of task size, complexity, or requests for more perspectives; reuse the existing three members for follow-ups.

If the user persistently asks for additional agents, pause and explicitly double-check whether they intend to override this three-agent limit before creating any more. Do not infer an override from a broad request for more thoroughness or parallel work.

## Workflow

1. Gather enough source context to shape the task responsibly: current behavior, constraints, relevant files/docs, prior decisions, and known unknowns using Shaping skill.
2. Draft a concise shape before asking the council. Include the goal, non-goals, proposed approach, alternatives rejected, risks, validation plan, and open questions.
3. Ask all three council members after the initial shape exists:
   - Codex: start a subagent configured for model `gpt-6.1-sol` with `xhigh` reasoning. Ask it to critique the shape, find missing context, identify simpler alternatives, and call out implementation or validation risks.
   - Claude/Fable and Claude/Opus: run the `claude` commands below.
4. Never use fast mode for council shaping unless the user explicitly asks for fast mode. Do not disable tools or skills for the Claude members beyond the file-edit tools below.
5. Use one session id per Claude member per task, generated with `uuidgen | tr A-Z a-z`. Reuse each member’s own session for follow-ups; never share a session between the two models.
6. Compare council feedback against the source context. Accept feedback only when it is supported by evidence or exposes a real uncertainty. Reject or qualify feedback that depends on false assumptions, stale context, or invented constraints.
7. Use back-and-forth in each Claude member’s existing session, and with the Codex subagent when practical, to resolve important disagreement. Either convince the council with concrete evidence or update the shape.
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

Please critique this shape. Focus on missing context, hidden assumptions, simpler options, bad boundaries, implementation risks, and validation gaps. Be concrete and cite which claim depends on which evidence. Understand the bigger problem and the goal and come with the most lean solution possible.
```

For both Claude members, run from the repository being shaped and paste each id literally:

```bash
claude -p "prompt" --model fable --effort xhigh --session-id <fable-id> --disallowedTools "Edit,Write,NotebookEdit"
claude -p "prompt" --model opus --effort xhigh --session-id <opus-id> --disallowedTools "Edit,Write,NotebookEdit"
```

For follow-up turns, swap `--session-id <id>` for `--resume <id>` and keep every other flag. `--disallowedTools` does not carry over to a resumed session:

```bash
claude -p "follow-up prompt" --model fable --effort xhigh --resume <fable-id> --disallowedTools "Edit,Write,NotebookEdit"
claude -p "follow-up prompt" --model opus --effort xhigh --resume <opus-id> --disallowedTools "Edit,Write,NotebookEdit"
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
