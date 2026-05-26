# Steal Audit: mcp-code-graph (Gemini Run)
**Mode**: Full
**Calibration Verdict**: Boilerplate / API Wrapper (<1000 LOC, no local business logic). Shallow audit.
**Files Scanned**: 3 TypeScript source files.
**Bucket Distribution**: E: 0, C: 0, B: 0, D: 4.

## 🎯 Headline Summary
| Bucket | Score | Name | Source | Gist |
|---|---|---|---|---|
| D | N/A | SaaS nodes-semantic-search | `index.ts` | Thin API wrapper for cloud semantic search |
| D | N/A | SaaS get-usage-dependency-links | `index.ts` | Thin API wrapper for cloud blast-radius |
| D | N/A | SaaS find-direct-connections | `index.ts` | Thin API wrapper for cloud topology query |
| D | N/A | SaaS docs-semantic-search | `index.ts` | Thin API wrapper for cloud doc search |

## ❌ Bucket D (Niche / Wrong Fit)
### D1: SaaS nodes-semantic-search
- **Source**: `src/index.ts:269`
- **Violated Principle**: Local-first & No third-party API for core. All heavy lifting is offloaded to `api-mcp.codegpt.co`. Cortex implements this locally via `cortex_find`.

### D2: SaaS get-usage-dependency-links
- **Source**: `src/index.ts:487`
- **Violated Principle**: Local-first & No third-party API for core. Cortex implements impact analysis natively and locally via the `before_change` workflow.

### D3: SaaS find-direct-connections
- **Source**: `src/index.ts:186`
- **Violated Principle**: Local-first. Cortex manages relationships locally using `[[WikiLink]]` edges.

### D4: SaaS docs-semantic-search
- **Source**: `src/index.ts:342`
- **Violated Principle**: Local-first. Cortex treats all knowledge, including documentation, as locally indexed.

## 🕵️‍♂️ Expected but Absent (Negative Space)
- **Local State**: The server maintains zero local state, relying entirely on the remote SaaS.
- **AST Parsers**: No local syntax extraction (delegated to cloud).
- **Search Indices**: No local SQLite or Faiss stores.

## ⚠️ Audit Limitations
- Target is purely an API client. There are no architectural features or local processing algorithms to evaluate against Cortex's implementation plan.
