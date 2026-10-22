# CLAUDE.md

Mémoire du projet pour un agent qui reprend le travail sans contexte.
Le README explique le projet à un humain ; ce fichier donne ce qu'il faut pour travailler dedans.

## Projet

`mcp-notepad` — serveur MCP (Model Context Protocol) en TypeScript / Node.js.
Bloc-notes partagé : plusieurs agents IA lisent et écrivent via 4 outils MCP.
Persistance Neon Postgres, déployé sur Vercel Functions.

## Commandes

| Commande               | Effet                                                    |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | serveur local port 3000 (tsx watch, charge `.env.local`) |
| `npm run verify`       | lint + format:check + typecheck + tests (= CI)           |
| `npm test`             | vitest run (suite Neon ignorée sans `DATABASE_URL`)      |
| `npm run test:db`      | tests incluant la suite Neon (charge `.env.local`)       |
| `npm run db:migrate`   | applique `db/schema.sql` (charge `.env.local`)           |
| `npm run typecheck`    | tsc --noEmit                                             |
| `npm run lint`         | eslint                                                   |
| `npm run lint:fix`     | eslint --fix                                             |
| `npm run format`       | prettier --write                                         |
| `npm run format:check` | prettier --check                                         |

## Conventions techniques

- ESM (`"type": "module"`) — imports relatifs en `.js`
- TypeScript 6.x (`module`/`moduleResolution`: nodenext, `target`: es2023, strict, output `dist/`)
- TypeScript 7 incompatible avec `typescript-eslint` — rester en 6.x
- `exactOptionalPropertyTypes: false` — incompatible avec les types structurels du SDK dans `dev.ts`
- Zod importé depuis `zod/v4` (SDK MCP v2)
- CI (`.github/workflows/ci.yml`) : lint → format:check → typecheck → test, Node 24

## État d'avancement

Tous les lots sont terminés :

- Lot 0 — projet TS strict, Vitest, ESLint 10 + Prettier, CI GitHub Actions
- Lot 1 — règles du bloc-notes (`src/rules.ts`), catégories fermées
- Lot 2 — serveur MCP + dev server `node:http` sur le port 3000
- Lot 3 — persistance Neon Postgres, tests de contrat sur les deux implémentations
- Lot 4 — les 4 outils avec leurs garde-fous
- Lot 5 — identité de l'agent (`X-Agent-Name`) + journal de tous les appels
- Lot 6 — authentification par clé partagée (`MCP_API_KEY`)
- Lot 7 — page de lecture HTML (`/view?key=VIEW_KEY`) avec clé séparée
- Lot 8 — déploiement Vercel + démo multi-clients

## Ce qui existe

```
src/
├── notepad-server.ts   createNotepadServer(store, log, agent) — enregistre les 4 outils
│                       wrapper `logged` enveloppe chaque handler (journalisation automatique)
├── rules.ts            NOTEPAD_RULES (texte pour l'agent) + NOTEPAD_CATEGORIES
├── validation.ts       validateNoteContent — préfixe de catégorie obligatoire, max 280 chars
├── auth.ts             readAgentName (header ou ?agent=), isAuthorizedKey (MCP),
│                       isViewAuthorized (page), isAuthorized (Request wrapper Vercel)
│                       comparaison en temps constant (timingSafeEqual)
├── view.ts             renderPage — rendu HTML des notes et du journal (escapeHtml partout)
├── dev.ts              serveur node:http local, route /mcp + /view
└── store/
    ├── types.ts        interfaces NotesStore et ActionLog
    ├── memory.ts       implémentations en mémoire (tests)
    ├── neon.ts         implémentations Postgres (prod)
    └── index.ts        createStores() — choisit selon DATABASE_URL

api/                    points d'entrée Vercel (assemblage uniquement)
├── index.ts            landing page publique (/)
├── mcp.ts              endpoint MCP (/mcp) — factory par requête, auth Bearer
└── view.ts             page de consultation (/view?key=…)

db/
├── schema.sql          tables notes et action_log
└── migrate.ts          applique le schéma

tests/
├── server.test.ts      teste le vrai createMcpHandler via Client MCP in-process
├── store.test.ts       tests de contrat (memory + neon si DATABASE_URL présente)
├── auth.test.ts        tests d'authentification
└── helpers/
    └── store-contract.ts   suite partagée entre memory et neon
```

### Variables d'environnement

| Variable       | Rôle                                  | Où                   |
| -------------- | ------------------------------------- | -------------------- |
| `DATABASE_URL` | connexion Neon Postgres               | `.env.local`, Vercel |
| `MCP_API_KEY`  | clé d'accès aux outils MCP            | `.env.local`, Vercel |
| `VIEW_KEY`     | clé d'accès à la page de consultation | `.env.local`, Vercel |

Exemple dans `.env.example`.

## Décisions d'architecture

- **SDK MCP v2** — `McpServer`, `registerTool`, `createMcpHandler`, Zod `zod/v4`
- **Factory par requête** — `createMcpHandler(factory)` instancie un `McpServer` par requête HTTP ; permet de lire `ctx.requestInfo` pour le nom d'agent ; le store vit hors de la factory (partagé)
- **Injection de dépendances** — `createNotepadServer` ne connaît que les interfaces `NotesStore`/`ActionLog`, jamais Neon directement
- **Une note = une ligne en base** — `append_note` = INSERT, pas de race condition entre agents
- **Garde-fous côté serveur** — `z.literal(true)` sur `confirmed` empêche `replace_notes` accidentel ; validation du préfixe de catégorie côté serveur
- **Messages d'erreur pour LLM** — rappellent les catégories valides + exemple ; le consommateur est un modèle, pas un développeur
- **Wrapper `logged`** — enveloppe chaque handler → impossible d'oublier de journaliser un appel
- **Deux clés séparées** — `MCP_API_KEY` (lecture+écriture) et `VIEW_KEY` (consultation seule) : compromettre l'une ne donne pas accès à l'autre
- **Comparaison en temps constant** (`timingSafeEqual`) pour les clés
- **Pas de framework** — `node:http` en dev, Vercel Functions en prod

## Pièges rencontrés

- **Vercel détecte `src/server.ts` comme entrypoint** et ignore le dossier `api/` → fichier renommé en `src/notepad-server.ts` (commit `c0bafed`)
- **Vercel Deployment Protection** intercepte toutes les requêtes avant la function → doit être désactivée
- **Les variables d'environnement Vercel** ne s'appliquent qu'aux déploiements suivants → redéployer après ajout

## Limites assumées

- `replace_notes` : deux requêtes sans transaction (le driver HTTP Neon ne supporte pas les transactions)
- `confirmed: true` n'est pas une preuve de consentement utilisateur, juste un garde-fou contre l'appel accidentel
- L'identité de l'agent (`X-Agent-Name`) est déclarative, choisie par le client
- Les tests Neon vident la table `notes` — base de dev et de test confondues
- La catégorie est stockée dans le préfixe du contenu, pas dans une colonne dédiée
- Un seul bloc-notes global, pas de cloisonnement par projet

## Exigences du TP

| Exigence                                    | État |
| ------------------------------------------- | ---- |
| Les 4 outils fonctionnent                   | fait |
| L'agent appelle get_rules() d'abord         | fait |
| Le contenu persiste                         | fait |
| Une clé protège l'accès                     | fait |
| Chaque appel journalisé avec un nom d'agent | fait |
| La page affiche notes et historique         | fait |
| Serveur accessible à distance               | fait |
| Un vrai client MCP utilise le serveur       | fait |
| Modification visible depuis un autre client | fait |

## Déploiement Vercel

- URL de production : `https://mcpnodepad.vercel.app`
- `vercel.json` : `framework: null`, rewrites `/` → `/api/index`, `/mcp` → `/api/mcp`, `/view` → `/api/view`
- Trois serverless functions dans `api/`

## Prochaines étapes

Pas de lot en cours. Pistes d'évolution (par ordre d'utilité, détaillées dans le README) :

1. Plusieurs documents (un bloc-notes par projet)
2. `update_note` / `delete_note`
3. Écriture depuis la page web
4. `get_history()` comme outil MCP
5. Recherche et filtrage dans `read_notes()`
6. OAuth 2.1 et permissions par utilisateur

## Tenue de ce fichier

Ce fichier est la mémoire du projet entre les sessions. Mets-le à jour toi-même :

- une étape passe à l'état fait → coche-la
- une décision d'architecture est prise → ajoute-la avec la raison
- un piège coûte plus de 10 minutes → ajoute-le dans « Pièges rencontrés »
- une limite connue est acceptée → ajoute-la dans « Limites assumées »
- un fichier, script ou variable d'environnement est ajouté → mets à jour l'arborescence

Ne consigne pas : l'avancement d'une session, les commandes lancées, ce qui est lisible dans le code ou l'historique Git.
