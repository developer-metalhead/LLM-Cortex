Call the `read_knowledge_index` tool from the `project-cortex` MCP server and display the full knowledge index to the user.

The index includes a description, source file, and outbound links for every synthesized entity and concept. This is the project's architectural memory — use it as your primary context before opening any source files.

If the user asks about a specific entity or concept, call `read_entity` or `read_concept` with the exact name shown in the index to get its full synthesized page.
