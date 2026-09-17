# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`mcp-notepad` is an MCP (Model Context Protocol) server. The project is in early stages — only `package.json` exists so far.

## Key Configuration

- **ESM modules**: `"type": "module"` in package.json — use `import`/`export` syntax throughout.
- No build system, test framework, or dependencies are configured yet.

## MCP Development Notes

MCP servers expose tools/resources to LLM clients via the MCP protocol. The typical entry point is a single server file that registers handlers and connects via stdio or SSE transport. The standard Node.js MCP SDK is `@modelcontextprotocol/sdk`.
