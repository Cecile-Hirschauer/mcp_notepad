# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`mcp-notepad` is a Node.js MCP (Model Context Protocol) server written in TypeScript.

## Commands

```bash
npm test            # vitest run
npm run dev         # tsx watch src/dev.ts
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run lint:fix
npm run format      # prettier --write
npm run format:check
npm run verify      # lint + format:check + typecheck + test (mirrors CI)
```

## Key Configuration

- **ESM modules**: `"type": "module"` — use `import`/`export` and `.js` extensions in imports.
- **TypeScript**: `module/moduleResolution: nodenext`, `target: es2023`, strict mode, output to `dist/`.
- **CI** (`.github/workflows/ci.yml`): runs lint → format:check → typecheck → test on Node 24.

## MCP Development Notes

MCP servers expose tools/resources to LLM clients via the MCP protocol. Dependencies in use: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `zod`. Entry point for dev: `src/dev.ts`.
