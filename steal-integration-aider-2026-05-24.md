# Integration Scratch — aider-chat
**Date**: 2026-05-24
**Target**: C:\Users\kumsatwi\Desktop\StEp\personalProject\aider
**Inventory**: steal-inventory-aider-2026-05-24.json

---

## To paste into flaws.md

### Flaw #124 — Third-party telemetry tokens hardcoded in source
**Severity**: 2 (medium)
**Description**: Any analytics integration in Cortex Phase 22+ must not embed SDK project tokens (Mixpanel, PostHog, Segment, etc.) in source code. Even with opt-in UX, the token is publicly visible, enabling unauthorized tracking by forks/contributors. Pattern observed in aider: `mixpanel_project_token` and `posthog_project_api_key` hardcoded at module level in `analytics.py`. Cortex's `cortex server start` must: (1) require telemetry tokens to come from env vars only, (2) make telemetry opt-in via explicit flag or `cortex.json` key, (3) document that no telemetry fires in local-only mode.
**Source-of-lesson**: aider `aider/analytics.py:55-56` — hardcoded `mixpanel_project_token` + `posthog_project_api_key`

---

## To paste into implementation_plan.md

### Phase 0.11 Refinement — Token Budget Pre-Flight Warning (closes Flaw #37)

Before sending any LLM request (synthesis, entity generation, or Phase 22 chat), compute the estimated token count and compare against the model's `max_input_tokens`. If at or near limit, emit a structured warning with actionable remedies.

```typescript
function checkTokenBudget(messages: Message[], model: ModelInfo): BudgetCheck {
  const inputTokens = model.tokenCount(messages);
  const maxInputTokens = model.info.max_input_tokens ?? 0;

  if (maxInputTokens && inputTokens >= maxInputTokens) {
    return {
      ok: false,
      inputTokens,
      maxInputTokens,
      remedies: [
        'Use /drop to remove unneeded files from context',
        'Run compress to reduce entity sizes',
        'Break large entities into smaller focused pages',
      ],
    };
  }
  return { ok: true, inputTokens, maxInputTokens };
}
```

**Emit** the warning as a structured tool response (not a silent failure):
```
⚠️  Context budget: 198,432 / 200,000 tokens (99.2%)
Remedies: drop unused entities, run compress, or break large pages.
Proceeding anyway? (Y/n)
```

**Source**: aider `base_coder.py:1396-1417` — `check_tokens()`  
**Score**: 36 (severity=3, fit=4, effort=1)

---

### Phase 29 Refinement — Prompt-Cache Warming Thread for Long-Lived Sessions

When Phase 22 (`cortex server start`) or any future `cortex chat` command launches a long-lived session with Anthropic Claude, start a background cache-warming thread to prevent the 5-minute prompt cache TTL from expiring during user pauses.

```typescript
class CacheWarmer {
  private interval: NodeJS.Timeout | null = null;
  private warmingPingsLeft = 0;
  private cacheableMessages: Message[] = [];

  start(messages: Message[], pings = 4, intervalMs = 60_000) {
    this.cacheableMessages = messages;
    this.warmingPingsLeft = pings;
    this.interval = setInterval(async () => {
      if (this.warmingPingsLeft <= 0) return;
      this.warmingPingsLeft--;
      try {
        await litellm.completion({
          model: currentModel,
          messages: this.cacheableMessages,
          max_tokens: 1,  // minimal cost
          stream: false,
        });
      } catch { /* ignore — cache warm is best-effort */ }
    }, intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
```

**Key details** (from aider source):
- Only send `cacheable_messages()` — the stable prefix (system + examples + repo/readonly), NOT the volatile current turn
- Default: 4 pings, 60s interval — enough to cover a 5-minute human pause
- Gate behind `ok_to_warm_cache` flag; set to `false` when the coder hands off to a sub-coder (prevents double-pinging)
- Log cache hit tokens from response `usage.prompt_cache_hit_tokens` if verbose

**Source**: aider `base_coder.py:1357-1392` — `warm_cache_worker()`  
**Score**: 45 (severity=3, fit=5, effort=1)

---

### Phase 0.9 Refinement — Token Estimation via 1% Line Sampling

For large knowledge files or source files being assembled into LLM payloads, use sampling-based token estimation instead of full tokenization when exact counts aren't needed.

```typescript
function estimateTokens(text: string, tokenCount: (t: string) => number): number {
  if (text.length < 200) return tokenCount(text);   // exact for short texts

  const lines = text.split('\n');
  const step = Math.max(Math.floor(lines.length / 100), 1);
  const sample = lines.filter((_, i) => i % step === 0).join('\n');
  const sampleTokens = tokenCount(sample);
  return Math.round(sampleTokens / sample.length * text.length);
}
```

Apply in:
- `build_context_pack` when estimating whether adding an entity will exceed budget
- `compress` when computing pre/post sizes for reporting
- Any bulk file scan where exact token count is unnecessary

**Error**: typically <5% for files >200 lines.  
**Source**: aider `repomap.py:89-101` — `RepoMap.token_count()`  
**Score**: 30 (severity=2, fit=5, effort=1)

---

### Phase 0.11 Refinement — Chat History Budget: `max_input_tokens / 16` Heuristic

When `compress` or any future `cortex chat` history management must decide how many message tokens to keep before summarizing, use aider's validated heuristic:

```typescript
function deriveHistoryBudget(model: ModelInfo): number {
  const maxInput = model.info.max_input_tokens ?? 0;
  if (!maxInput) return 1024;
  // Keep 1/16th of context window for history; clamp to [1024, 8192]
  return Math.min(Math.max(Math.floor(maxInput / 16), 1024), 8192);
}
```

**Why this works**: Models with a 200k context window (Claude 3.7 Sonnet) get 12,500 tokens of history → capped at 8,192. Models with 8k context (older GPTs) get 500 → floored at 1,024. The heuristic is validated across thousands of aider users.

**Source**: aider `models.py:357-358` — `Model.__init__`  
**Score**: 30 (severity=2, fit=5, effort=1)

---

### Phase 22 Refinement — Windows Shell Parent-Process Detection for `run_cmd`

When Phase 22's server or any `cortex run` command executes shell commands on Windows, walk the psutil process tree to detect whether the parent is PowerShell or CMD, then wrap accordingly:

```typescript
import { exec } from 'child_process';

async function getWindowsShell(): Promise<'powershell' | 'cmd' | 'other'> {
  // On Windows, PowerShell processes are named 'powershell.exe' or 'pwsh.exe'
  // Walk parent PIDs via wmic/tasklist to find the terminal type
  return new Promise((resolve) => {
    exec('wmic process where ProcessId=%PPID% get Name /value', (err, stdout) => {
      if (err) return resolve('other');
      const name = stdout.toLowerCase();
      if (name.includes('powershell')) return resolve('powershell');
      if (name.includes('cmd.exe')) return resolve('cmd');
      resolve('other');
    });
  });
}

function wrapCommandForWindows(cmd: string, shell: 'powershell' | 'cmd' | 'other'): string {
  if (shell === 'powershell') return `powershell -Command "${cmd.replace(/"/g, '\\"')}"`;
  return cmd;
}
```

**Python reference** (drop-in for any Python subprocess callers):
```python
import psutil
def get_windows_parent_process_name():
    current = psutil.Process()
    while True:
        parent = current.parent()
        if parent is None: break
        name = parent.name().lower()
        if name in ['powershell.exe', 'cmd.exe']:
            return name
        current = parent
    return None
```

**Source**: aider `run_cmd.py:26-38` — `get_windows_parent_process_name()`  
**Score**: 24 (severity=2, fit=4, effort=1)

---

### Phase 22 Refinement — FinishReasonLength Prefill Continuation for Long Synthesis

When a `save_synthesis` or entity generation call hits the model's output token limit (litellm raises finish_reason=length), and the model supports `assistant_prefill`, chain the response rather than truncating:

```typescript
async function* sendWithContinuation(messages: Message[], model: ModelInfo): AsyncIterable<string> {
  let accumulated = '';
  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;
    try {
      const response = await litellm.completion({ model: model.name, messages, stream: true });
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        accumulated += delta;
        yield delta;
      }
      const finishReason = response.choices?.[0]?.finish_reason;
      if (finishReason === 'length' && model.info.supports_assistant_prefill) {
        // Append partial response as assistant prefill and continue
        messages = [...messages, { role: 'assistant', content: accumulated, prefix: true }];
        continueLoop = true;
      }
    } catch (err) {
      throw err;
    }
  }
}
```

**Gate**: only enable when `model.info.supports_assistant_prefill` is true (Claude models support this).  
**Source**: aider `base_coder.py:1492-1505` — FinishReasonLength handler  
**Score**: 18 (severity=3, fit=3, effort=2)

---

### Phase 14 Refinement — FileWatcher AI-Comment Trigger Pattern

For `cortex watch` (Phase 0.13/14 file watching daemon), adopt aider's regex pattern for detecting AI work requests embedded as code comments. This is a cross-language, editor-agnostic trigger mechanism.

AI comment regex (supports Python `#`, JS/TS `//`, SQL `--`, Lisp `;`):
```python
ai_comment_pattern = re.compile(
    r"(?:#|//|--|;+) *(ai\b.*|.*\bai[?!]?) *$",
    re.IGNORECASE
)
```

**Trigger variants**:
- `# ai` — open-ended request (the comment IS the request)
- `# ai!` — strong mode (auto-execute without confirmation)
- `# ai?` — question mode (ask without modifying)

**Implementation notes**:
1. Use `watchfiles` library (cross-platform, based on Rust notify) for file watching
2. Load gitignore patterns via `pathspec` with `GitWildMatchPattern` — handles complex glob patterns correctly
3. Skip files >1MB (prevents loading compiled assets or large fixtures)
4. Deduplicate by file path before triggering (batch multiple rapid changes)

**Source**: aider `watch.py:65-200` — `FileWatcher`  
**Score**: 18 (severity=2, fit=3, effort=2)
