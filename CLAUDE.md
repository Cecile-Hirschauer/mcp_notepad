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

MCP servers expose tools/resources to LLM clients via the MCP protocol. Dependencies in use: `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `zod`. Entry point for dev: `src/dev.ts`.

## État d'avancement

- ✅ Lot 0 — projet TS strict (ESM, nodenext), Vitest, ESLint 10 + Prettier, CI GitHub Actions
- ✅ Lot 2 — serveur MCP : 4 outils (`get_rules`, `read_notes`, `append_note`, `replace_notes`),
  validation dans `src/validation.ts`, store en mémoire, dev server `node:http` port 3000, 17 tests verts
- ⏭️ Prochaine étape — Lot 1 : rédiger les vraies règles dans `src/rules.ts`

## Décisions d'architecture

- SDK MCP v2 (`@modelcontextprotocol/server` 2.3.1 + `/node` 2.1.1 + `/client`)
- TypeScript 6 — **pas** la 7, ESLint n'est pas compatible
- Node.js + TS pur, sans framework. Déploiement prévu : Vercel Functions (`/api`), stockage Neon
- Injection de dépendances : `createNotepadServer(store)` ne connaît que l'interface `NotesStore`.
  Le store Neon se branchera sans toucher au serveur
- Une note = une ligne en base, pas un bloc de texte réécrit → pas de race condition sur l'append
- Imports relatifs en `.js` (contrainte ESM + nodenext)
- Tests in-process : `createMcpHandler` + `StreamableHTTPClientTransport` avec `fetch` intercepté — zéro port réseau
- Schemas outils : `zod/v4` (`import * as z from 'zod/v4'`)

### Structure des fichiers source
```
src/
  rules.ts          # constante NOTEPAD_RULES
  validation.ts     # validateNoteContent (préfixe, longueur, non-vide)
  server.ts         # factory createNotepadServer(store, agent?)
  dev.ts            # point d'entrée npm run dev (node:http, port 3000)
  store/
    types.ts        # interfaces Note, NotesStore
    memory.ts       # InMemoryNotesStore
tests/
  store.test.ts
  server.test.ts
```

## Commandes utiles

- `npm run dev` — serveur local sur http://127.0.0.1:3000/mcp
- `npm run verify` — lint + format + typecheck + tests (ce que fait la CI)
