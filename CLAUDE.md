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
- ✅ Lot 1 — règles du bloc-notes rédigées (`src/rules.ts`), catégories fermées
- ✅ Lot 2 — serveur MCP + dev server `node:http` sur le port 3000
- ✅ Lot 4 — les 4 outils avec leurs garde-fous
- ✅ Lot 5 — identité de l'agent (`X-Agent-Name`) + journal de tous les appels
- ✅ Lot 3 — persistance Neon Postgres, tests de contrat sur les deux implémentations
- ✅ Lot 6 — authentification par clé partagée (MCP_API_KEY)
- ✅ Lot 7 — page de lecture HTML (`/view?key=VIEW_KEY`) avec clé séparée
- ⏭️ Prochaine étape — déploiement Vercel, puis démo multi-clients

## Ce qui existe

src/
├── rules.ts NOTEPAD_RULES (texte pour l'agent) + NOTEPAD_CATEGORIES
├── validation.ts validateNoteContent — préfixe de catégorie, longueur max 280
├── auth.ts readAgentName, isAuthorizedKey (MCP), isViewAuthorized (page)
├── view.ts renderPage — rendu HTML des notes et du journal (escapeHtml partout)
├── server.ts createNotepadServer(store, log, agent) + wrapper `logged`
├── dev.ts serveur node:http local, route /view séparée du MCP
└── store/
├── types.ts interfaces NotesStore et ActionLog
├── memory.ts implémentations en mémoire
├── neon.ts implémentations Postgres
└── index.ts createStores() — choisit selon DATABASE_URL

db/schema.sql + db/migrate.ts tables notes et action_log

## Décisions d'architecture

- SDK MCP v2 — `McpServer`, `registerTool(name, config, handler)`, `createMcpHandler(factory)`,
  `toNodeHandler` pour Node. Zod importé depuis `zod/v4`
- La factory tourne **une fois par requête** : c'est ainsi qu'on lit `ctx.requestInfo`
  pour récupérer le nom de l'agent. Le store, lui, vit hors de la factory
- Injection de dépendances : le serveur ne connaît que les interfaces, jamais Neon
- Une note = une ligne en base → `append` est un INSERT, pas de race condition
- Garde-fous côté serveur plutôt que règles déclaratives seules :
  `z.literal(true)` sur `confirmed` rend `replace_notes` impossible à appeler par accident
- Les messages d'erreur sont rédigés **pour un LLM** : ils rappellent les catégories valides
- Le wrapper `logged` enveloppe chaque handler → impossible d'oublier de journaliser
- TypeScript 6 (pas 7, ESLint incompatible) ; `exactOptionalPropertyTypes: false`
  (incompatible avec les types structurels du SDK dans `dev.ts`)
- Imports relatifs en `.js` (ESM + nodenext)

## Limites assumées (à citer en soutenance)

- `replace_notes` : deux requêtes sans transaction (le driver HTTP Neon ne les supporte pas)
- `confirmed: true` n'est pas une preuve de consentement utilisateur, mais empêche
  l'appel accidentel et rend l'acte traçable
- Les tests Neon vident la table `notes` — base de dev et de test confondues
- La catégorie reste dans le préfixe du contenu, pas dans une colonne dédiée

## Exigences du TP

| Exigence | État |
|---|---|
| Les 4 outils fonctionnent | ✅ |
| L'agent appelle get_rules() d'abord | ✅ |
| Le contenu persiste | ✅ |
| Une clé protège l'accès | ✅ |
| Chaque appel journalisé avec un nom d'agent | ✅ |
| La page affiche notes et historique | ✅ |
| Serveur accessible à distance | ⏳ Vercel |
| Un vrai client MCP utilise le serveur | ⏳ |
| Modification visible depuis un autre client | ⏳ |

## Commandes

- `npm run dev` — serveur local (charge `.env.local`)
- `npm run verify` — lint + format + typecheck + tests (ce que fait la CI)
- `npm run test:db` — tests incluant la suite Neon
- `npm run db:migrate` — applique `db/schema.sql`
