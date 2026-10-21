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

MCP servers expose tools/resources to LLM clients via the MCP protocol. Dependencies in use: `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `zod`. Entry point for dev: `src/dev.ts` (à créer).

## État du projet

### Lot 2 — fait (commits 285a112, b63455f, 2714629)

Fichiers livrés :
- `src/rules.ts` — constante `NOTEPAD_RULES` (texte des règles)
- `src/store/types.ts` — interfaces `Note` et `NotesStore` (`listNotes`, `appendNote`, `replaceNotes`)
- `src/store/memory.ts` — `InMemoryNotesStore` (implémentation en mémoire)
- `src/server.ts` — factory `createNotepadServer(store): McpServer` avec 2 outils enregistrés : `get_rules` et `read_notes`
- `tests/store.test.ts` — tests unitaires du store
- `tests/server.test.ts` — tests in-process du serveur MCP (voir ci-dessous)

### Prochaine étape — Lot 3

1. Créer `src/dev.ts` : instancie `InMemoryNotesStore` + `createNotepadServer`, branche sur stdio transport pour `npm run dev`.
2. Tester avec **MCP Inspector** (`npx @modelcontextprotocol/inspector`).
3. Ajouter l'outil `append_note` (paramètres : `content: string`, `agent: string`).

## Décisions d'architecture

### Pattern factory avec injection de store
`createNotepadServer(store)` reçoit le store en paramètre → le serveur est testable sans I/O. Les tests injectent `InMemoryNotesStore` directement.

### Tests in-process (pas de port réseau)
Technique utilisée dans `tests/server.test.ts` :
```ts
handler = createMcpHandler(() => createNotepadServer(store));
const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
  fetch: (url, init) => handler.fetch(new Request(url, init)),
});
client = new Client({ name: 'test-harness', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } });
await client.connect(transport);
```
`createMcpHandler` vient de `@modelcontextprotocol/server` ; `Client` + `StreamableHTTPClientTransport` viennent de `@modelcontextprotocol/client`.

### Schemas Zod
Utiliser `zod/v4` (import `* as z from 'zod/v4'`) pour les `inputSchema` des outils.

### Structure des fichiers source
```
src/
  rules.ts          # constante NOTEPAD_RULES
  server.ts         # factory createNotepadServer
  dev.ts            # point d'entrée npm run dev (à créer)
  store/
    types.ts        # interfaces Note, NotesStore
    memory.ts       # InMemoryNotesStore
tests/
  store.test.ts
  server.test.ts
```
