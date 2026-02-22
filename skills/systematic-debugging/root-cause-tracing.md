# Root Cause Tracing

Bugs often manifest deep in the call stack. Your instinct is to fix where the error appears — that's treating a symptom.

**Core principle:** Trace backward through the call chain until you find the original trigger, then fix at the source.

## The Process

### 1. Observe the Symptom
```
Error: git init failed in /Users/jesse/project/packages/core
```

### 2. Find Immediate Cause
```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

### 3. Ask: What Called This With Bad Data?
```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → called by Session.initializeWorkspace()
  → called by Session.create()
  → called by test at Project.create()
```

### 4. Keep Tracing Up
- `projectDir = ''` (empty string!)
- Empty string as `cwd` resolves to `process.cwd()`
- That's the source code directory!

### 5. Find Original Trigger
```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed before beforeEach!
```

**Root cause:** Top-level variable initialization accessing empty value — 5 layers up from the symptom.

## Adding Stack Traces

When you can't trace manually, add instrumentation:

```typescript
async function gitInit(directory: string) {
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    stack: new Error().stack,
  });
  await execFileAsync('git', ['init'], { cwd: directory });
}
```

**Tips:**
- Use `console.error()` in tests — logger may be suppressed
- Log BEFORE the dangerous operation, not after it fails
- Include context: directory, cwd, env vars
- `new Error().stack` shows complete call chain

## Finding Which Test Pollutes

Use the bisection script `find-polluter.sh` in this directory:

```bash
./find-polluter.sh '.git' 'src/**/*.test.ts'
```

Runs tests one-by-one, stops at first polluter.

## Key Principle

**NEVER fix just where the error appears.** Trace back to find the original trigger, then fix at source AND add validation at each layer (see [defense-in-depth.md](defense-in-depth.md)).
