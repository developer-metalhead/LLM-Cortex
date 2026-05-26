# Steal Inventory — helpline (2026-05-25)

**Target**: `C:\Users\kumsatwi\Desktop\StEp\personalProject\helpline`
**Commit**: `456234a` | **Calibration**: Novel/research | **Files scanned**: 59/59 | **Mode**: Full

| ID | Bucket | Name | Source | Score | Confidence | Closes Flaw |
|----|--------|------|--------|-------|------------|-------------|
| E3 | E | Diff truncation with disclosure note | `.claude/hooks/reflect_claude_md.py:235-236` | 60 | high | #1 |
| C2 | C | Area-scoped diff for CLAUDE.md reflection | `.claude/hooks/reflect_claude_md.py:232-236` | 45 | high | — |
| C3 | C | CLAUDE_PROJECT_DIR env var for layout-agnostic root resolution | `.claude/hooks/session_start_context.py:25-26` | 45 | high | — |
| C4 | C | Windows-aware background Popen (DETACHED_PROCESS + start_new_session) | `.claude/hooks/propose_claude_md.py:126-147` | 45 | high | — |
| C1 | C | Self-improving Stop hook 3-guard pattern | `.claude/hooks/propose_claude_md.py:42-200, reflect_claude_md.py:44-268` | 40 | high | — |
| C6 | C | Subagent write-tool enforcement in validator | `tooling/validate/validate_all.py:153-171` | 36 | high | — |
| E1 | E | AST find_references/where_is/outline MCP tools | `tooling/mcp/codebase_search.py:182-249` | 32 | high | #28 |
| C5 | C | Dynamic SessionStart orientation hook | `.claude/hooks/session_start_context.py:29-138` | 32 | high | — |
| C7 | C | Diff truncation with _MAX_DIFF_CHARS disclosure | `.claude/hooks/reflect_claude_md.py:46, 235-236` | 30 | high | — |
| E2 | E | AI Layer validation framework (validate_all.py pattern) | `tooling/validate/validate_all.py:1-286` | 24 | high | #137 |
| A1 | A | Progressive disclosure in skills (SKILL.md + references/ subdir) | `.claude/skills/billing-money-rules/` | — | high | — |
| A2 | A | CLAUDE.md hierarchy (lean root + additive subdirectory) | `CLAUDE.md + services/*/CLAUDE.md` | — | high | — |
| A3 | A | .claudeignore excluding generated artifacts | `.claudeignore` | — | high | — |
| A4 | A | Skill path scoping (paths: frontmatter) | `.claude/skills/*/SKILL.md` | — | high | — |
| A5 | A | Plugin distribution pattern | `tooling/helpline-ai-layer/` | — | high | — |
| A6 | A | LSP recommendation in CLAUDE.md (navigate by symbol, not grep) | `CLAUDE.md:28-30` | — | high | — |
| A7 | A | CODEBASE_MAP.md / index.md concept | `CODEBASE_MAP.md` | — | high | — |
| A8 | A | settings.json allow/deny Bash permission lists | `.claude/settings.json` | — | high | — |
| B1 | B | CODEBASE_MAP.md vs index.md — Cortex superior but CODEBASE_MAP.md simpler to keep current | `CODEBASE_MAP.md` | — | high | — |
| D1 | D | Domain-specific billing/auth CLAUDE.md conventions | `services/billing/CLAUDE.md, services/auth/CLAUDE.md` | — | high | — |
| D2 | D | Application domain code (services/, packages/) | `services/, packages/` | — | high | — |
| D3 | D | Claude Code marketplace.json plugin format | `tooling/.claude-plugin/marketplace.json` | — | high | — |
| D4 | D | Domain models (models.py, repositories.py) | `packages/core/models.py, packages/db/repositories.py` | — | high | — |
| F1 | F | _EXCLUDE_DIRS frozenset duplicated across 4 files with subtle differences | `propose_claude_md.py:38-41, reflect_claude_md.py:39-42, session_start_context.py:18-21, codebase_search.py:44-48` | — | high | — |
| G1 | G | Should Cortex ship as a Claude Code plugin bundle? | `tooling/helpline-ai-layer/` | — | high | — |

## Bucket Distribution

| Bucket | Count | % |
|--------|-------|---|
| A (Already in Cortex) | 8 | 32% |
| B (Cortex superior) | 1 | 4% |
| C (Worth stealing) | 7 | 28% |
| D (Wrong fit / niche) | 4 | 16% |
| E (Closes a flaw) | 3 | 12% |
| F (Anti-pattern) | 1 | 4% |
| G (Open question) | 1 | 4% |
| **Total** | **25** | — |

## Key Findings

**Highest-value item (E3, score 60)**: The `reflect_claude_md.py:235-236` truncation pattern is a 2-line fix with outsized impact. Cortex's `get_pending_changes` silently returns `"[Diff Error] stdout maxBuffer length exceeded"` as a content string (Flaw #1) — the helpline pattern truncates at 12,000 chars and appends `"\n... (diff truncated for the reflection)"`. The two-part fix (truncate + explicit note) ensures the LLM always knows what happened.

**F1 anti-pattern to avoid**: `_EXCLUDE_DIRS` frozenset is defined separately in all 4 hook/MCP files with subtle inconsistencies — `codebase_search.py` correctly adds `.claude`, `.tox`, `site-packages` that the hooks lack, causing scans to read Claude config dirs. Cortex should define `EXCLUDE_DIRS` once in a shared config/constants module.

**G1 open question**: Should Cortex ship as a Claude Code plugin bundle? The helpline `tooling/helpline-ai-layer/` demonstrates the full bundle pattern — CLAUDE.md, hooks, skills, MCP server, .claudeignore, settings.json — installable into any repo. Cortex's Phase 0.15 (dual-track distribution) partially covers this, but the plugin bundle makes the "install Cortex into a new repo" workflow zero-config.
