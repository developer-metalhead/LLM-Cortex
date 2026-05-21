# CLAUDE.md

> Instructions and guidelines for Claude Code (CLI agent) in this workspace.

## 🛠️ Build and Test Commands
- **Install dependencies**: `npm install`
- **Compile project**: `npm run build`
- **Run test suite**: `npm test`
- **Local Dev / Run CLI**: `npm run dev`
- **Local MCP Server Test**: `npm run mcp`
- **Global symlink refresh**: `npm link`

## 🧠 Project Cortex — Architectural Memory
This project uses **Project Cortex** via the `project-cortex` MCP server. The knowledge base is located in `.knowledge/` and includes per-entity pages with detailed Role, Interface, Behavior, and Wiring guidelines.

### ⚠️ CRITICAL CONSTRAINTS (MUST ALWAYS FOLLOW):
1. **NO Native File Readers for Code**: 
   - You **MUST NOT** use native CLI commands (like `cat`, `less`, `grep`, `type`) or native file-reading tools (like `view_file`) to inspect, check, review, or read any code files (such as `.js`, `.ts`, `.py`, etc.).
   - You **MUST exclusively call the `source` MCP tool** for all code inspections. This ensures dynamic AST skeleton caching, delta-diff compression, and token-saving compliance.
2. **Consult Knowledge Index First**:
   - For any task that implements, refactors, modifies, or deletes code, you **MUST** first call `read_knowledge_index` to find the relevant entity and its Wiring section (blast radius) before making modifications.
3. **Always Output Brevity Statistics**:
   - If the MCP server returns a `📉 Cortex Brevity Stats` section in a tool response, you **MUST** copy, preserve, and append this exact statistics block at the very bottom of your final response to the user.

## 🎨 Code Style & Quality Guidelines
- **TypeScript & ESM**: Use modern ES module imports/exports.
- **Strict Typing**: Leverage strict types in all new modules.
- **Robust Error Handling**: Wrap files/IO in robust try-catches.
- **Testing**: Maintain 100% test coverage for all new cache/analysis rules.
