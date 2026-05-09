---
name: surgical-edits
description: Use before any code, config, or documentation edit. Use when the request uses vague verbs like "refactor", "clean up", "improve", "modernize", or "make better". Use when adjacent issues (dead code, bad style, smells, TODOs) are visible during a focused task. Use when tempted to do "while I'm here" cleanup.
---

# Surgical Edits

## Overview

**Core principle:** Every changed line must trace to an explicit request. Defensible ≠ authorized.

When you edit code, the diff is a contract. Anything in the diff that the user didn't ask for is unauthorized — even if it's an improvement, even if it's "obviously better," even if it took 2 seconds.

Inspired by [Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls, sharpened against observed failure modes.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
NO CHANGED LINE WITHOUT AN EXPLICIT REQUEST FOR IT
```

Every line in your diff must trace directly to what the user asked for. If it doesn't, revert it. No exceptions.

**No exceptions:**
- Not for security upgrades you noticed
- Not for "drop-in" improvements
- Not for "obviously broken" things
- Not for inconsistent formatting
- Not for dead code you can prove is unused
- Not for fixing bugs the user didn't mention
- Not for updating stale comments
- Not for renaming to match modern conventions

If you noticed something, **flag it. Don't fix it.**

## The Vague-Verb Trap

Vague verbs unlock unbounded scope. Refuse to act on them until they're made specific.

| Vague request | What you must do first |
|---|---|
| "Refactor X" | Ask: which behaviors must be preserved? What's the success test? Which parts are in scope? |
| "Clean up Y" | Ask: clean what specifically — formatting, dead code, naming, structure? Pick one. |
| "Improve Z" | Ask: improve along what axis — readability, performance, safety? By what measure? |
| "Modernize W" | Ask: modernize which constructs? Which old constructs stay because they work? |
| "Make this better" | Ask: better at what? How will we know? |

**Rule:** When a request uses a vague verb with no verifiable success criteria, STOP. Do not edit. Invoke `shaping` to convert it into a list of specific changes with an acceptance proof. Then this skill applies to the resulting concrete edits.

The failure mode: an agent given "refactor auth.py to be cleaner" makes 5 unrequested changes (algorithm swap, token rewrite, comment rewrite, structure collapse, bug fix), each independently defensible, none authorized. **Cleanliness is not a verifiable goal.**

## The Minimum-Diff Test

Before saving any edit, run this test on every line in your diff:

> "Does this line exist because the user explicitly asked for it?"

- **Yes** → keep it.
- **No** → revert it, even if it's better.
- **Maybe** → revert it. "Maybe" means no.

Apply the test mechanically. Don't argue with yourself. Don't invoke "the spirit of the request."

## Adjacent Issues: Flag, Don't Fix

When you notice problems outside the scope of your task:

```
✅ DO: "I noticed `legacyDiscount` appears unused. Want me to remove it in a follow-up?"
❌ DON'T: silently delete it because it's "clearly dead"

✅ DO: "The MD5 hashing in hash_password is weak. Separate task to address?"
❌ DON'T: swap it for sha256 because it's a "drop-in upgrade"

✅ DO: "Mixed indentation in this file — fix as a separate change?"
❌ DON'T: reformat the whole file while adding one parameter
```

Flagging gives the user the choice. Fixing takes it from them.

## What "Surgical" Means in Practice

When asked to add parameter X to function F:
- ✅ Add the parameter and use it.
- ❌ Don't reformat F's body.
- ❌ Don't rename F to match a different convention.
- ❌ Don't add a JSDoc you weren't asked for.
- ❌ Don't fix the unrelated TODO above F.
- ❌ Don't tighten F's other parameter types.

When asked to fix a specific bug:
- ✅ Change the minimum to make the bug not happen.
- ❌ Don't refactor the function while you're in there.
- ❌ Don't fix other bugs you spot in the same file.
- ❌ Don't add input validation that wasn't requested.

When cleaning up after debugging (per `systematic-debugging`):
- ✅ Remove only the instrumentation YOU added.
- ❌ Don't remove pre-existing logging, even if it looks similar.

When asked to add a config entry:
- ✅ Add the entry.
- ❌ Don't normalize the file's quote style, indentation, or key order.

## Match Existing Style

Match what's there, even if you'd write it differently:
- Existing code uses `snake_case` and you'd prefer `camelCase`? Use `snake_case`.
- Existing code uses 2 spaces and you'd prefer 4? Use 2.
- Existing code uses `var`/`function` and you'd prefer `const`/arrow? Use `var`/`function`.
- Existing code has no semicolons and you'd add them? No semicolons.

Your job is consistency with the file, not personal preference. The user can ask for a style change as a separate request.

## Orphan Cleanup Rule

When YOUR change makes something unused, remove it:
- ✅ Removed the only call site of `helper()` → remove `helper()`.
- ✅ Replaced the import you added in a previous attempt → remove the unused import.
- ❌ Don't remove pre-existing unused code (it was unused before your change too).

The test: would this be unused if your change had not been made? If yes, leave it alone.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "It's a drop-in improvement, no behavior change" | The user didn't ask. They get to choose what changes. |
| "MD5 is cryptographically broken, I had to fix it" | You didn't have to. Flag it as a finding. |
| "While I'm here, this only takes 2 seconds" | Two seconds × every edit = unbounded scope creep. Don't. |
| "The formatting was inconsistent, I tidied it up" | You introduced noise to the diff and reviewer's load. Revert. |
| "It's clearly dead code, removing is safe" | "Clearly" and "safe" are your judgment, not theirs. Flag it. |
| "I'm following the spirit of the request" | The spirit of every request is "do what I asked, not more." |
| "The user said 'feel free to improve'" | Treat that as polite filler, not a blank check. Flag improvements; let them pick. |
| "Refactoring it slightly while I add the param is more efficient" | Two diffs are better than one diff that touches 5 things. Reviewability matters more than your keystrokes. |
| "This is what a senior engineer would do" | A senior engineer respects scope. They flag, then ask. |
| "Modernizing this comment to match new behavior" | If the comment is wrong because of YOUR change, update it. If it was already wrong, flag it. |

## Red Flags — STOP

If you catch yourself:
- About to edit a line that wasn't named in the request
- Reformatting code "while I'm at it"
- Removing dead code you didn't introduce
- Swapping an algorithm/library/API for a "better" one not asked for
- Updating a comment whose code you didn't change
- Renaming an identifier the user didn't ask to rename
- Fixing a bug the user didn't mention
- Acting on "refactor", "clean up", "improve", "modernize" without first defining what specifically
- Justifying a change with "drop-in", "obvious", "clearly", "trivial", "while I'm here", "spirit of"

**All of these mean: STOP. Revert the unrequested change. Flag it as a finding instead.**

## When Stuck

| Problem | Solution |
|---------|----------|
| Request is vague ("refactor", "clean up") | Refuse to edit. Invoke `shaping` to get verifiable scope. |
| Adjacent code is genuinely broken | Flag it. Don't fix it as part of this change. |
| Style mismatch makes change ugly | Match existing style. Suggest a separate style PR. |
| Your change reveals a real bug elsewhere | Flag it. New ticket, new diff. |
| User says "just fix everything you see" | Push back: "I'd rather fix what we name. Here's what I see — pick which to address." |

## Relationship to Other Skills

- **`shaping`** — When request is vague, defer to shaping to define verifiable scope. Surgical edits applies to the concrete changes that come out of shaping.
- **`tdd`** — In GREEN phase, "minimal code to pass the test" + this skill = no drive-by changes during implementation. In REFACTOR, this skill scopes the refactor to what's named.
- **`systematic-debugging`** — Throwaway reproduction scripts and instrumentation are exempt (they exist to be deleted). This skill applies to the eventual fix.

## The Bottom Line

The diff is the contract. If the user didn't ask for a line in your diff, that line shouldn't be there — no matter how defensible. Flag improvements as findings; let the user authorize them.

When in doubt: revert and ask.
