# MCP Shared Notepad

Un bloc-notes partagé que plusieurs agents IA peuvent lire et modifier via le
**Model Context Protocol**. Le contenu vit côté serveur : il survit aux sessions,
aux redémarrages, et il est accessible depuis n'importe quel client MCP.

- **Endpoint MCP** : `POST https://mcpnodepad.vercel.app/mcp`
- **Page de consultation** : `https://mcpnodepad.vercel.app/view?key=…`
- **Accueil** : `https://mcpnodepad.vercel.app/`

---

## Sommaire

- [Les outils exposés](#les-outils-exposés)
- [Architecture](#architecture)
- [Choix de conception](#choix-de-conception)
- [Sécurité](#sécurité)
- [Installation](#installation)
- [Brancher un client MCP](#brancher-un-client-mcp)
- [Tests et qualité](#tests-et-qualité)
- [Limites assumées](#limites-assumées)
- [Pistes d'évolution](#pistes-dévolution)

---

## Les outils exposés

| Outil                               | Rôle                                           | Nature     |
| ----------------------------------- | ---------------------------------------------- | ---------- |
| `get_rules()`                       | Retourne les conventions d'usage du bloc-notes | lecture    |
| `read_notes()`                      | Retourne les notes, avec auteur et date        | lecture    |
| `append_note(content)`              | Ajoute un fait sans toucher à l'existant       | écriture   |
| `replace_notes(content, confirmed)` | Écrase tout le bloc-notes                      | destructif |

### Format des notes

Chaque note est **un fait, une phrase**, préfixée par une catégorie issue d'une
liste fermée :

```
[deadline]  une date ou un délai à respecter
[decision]  un choix qui a été fait
[todo]      ce qui reste à faire
[info]      tout le reste
```

Le préfixe est validé côté serveur. Une note sans catégorie valide est rejetée
avec un message qui rappelle la liste attendue.

---

## Architecture

```
api/                    points d'entrée Vercel (assemblage uniquement)
├── index.ts            page d'accueil publique
├── mcp.ts              serveur MCP
└── view.ts             page de consultation

src/
├── rules.ts            NOTEPAD_RULES + NOTEPAD_CATEGORIES
├── validation.ts       validateNoteContent
├── auth.ts             clés d'accès + identité de l'agent
├── notepad-server.ts   createNotepadServer(store, log, agent)
├── view.ts             rendu HTML
├── dev.ts              serveur node:http local
└── store/
    ├── types.ts        interfaces NotesStore et ActionLog
    ├── memory.ts       implémentations en mémoire
    ├── neon.ts         implémentations Postgres
    └── index.ts        createStores()

db/
├── schema.sql          tables notes et action_log
└── migrate.ts          applique le schéma
```

**Stack** : Node.js + TypeScript, sans framework. SDK MCP TypeScript v2
(`@modelcontextprotocol/server`, `/node`, `/client`), Zod pour les schémas,
Neon Postgres pour la persistance, Vercel Functions pour l'hébergement.

### Le modèle d'exécution

`createMcpHandler(factory)` appelle la factory **une fois par requête HTTP**.
Chaque appel produit une instance neuve de `McpServer`, ce qui rend le serveur
stateless et donc compatible avec le serverless. L'état durable vit en base,
pas dans le processus.

C'est aussi ce qui permet de lire l'en-tête `X-Agent-Name` de la requête
courante : la factory reçoit `ctx.requestInfo`, la requête HTTP entrante.

### Injection de dépendances

`createNotepadServer(store, log, agent)` ne connaît que les interfaces
`NotesStore` et `ActionLog`. Elle ne crée ni connexion ni client Neon.

Conséquence directe : la même suite de tests valide les deux implémentations
(`tests/helpers/store-contract.ts`). Si l'implémentation Neon passe les mêmes
tests que celle en mémoire, les deux sont interchangeables — ce que le serveur
suppose depuis le départ.

---

## Choix de conception

### Règles déclaratives vs garde-fous

`get_rules()` retourne du texte que l'agent **peut ignorer**. C'est une
convention, pas une contrainte. Les vraies contraintes sont dans le code :

| Règle énoncée                             | Garde-fou correspondant                     |
| ----------------------------------------- | ------------------------------------------- |
| « une phrase par note »                   | longueur maximale de 280 caractères         |
| « préfixe de catégorie obligatoire »      | rejet si le préfixe est absent ou inconnu   |
| « demander confirmation avant d'écraser » | `confirmed: z.literal(true)` dans le schéma |
| « tout appel est journalisé »             | wrapper `logged` autour de chaque handler   |

Le cas le plus intéressant est `z.literal(true)`. Le SDK valide le schéma Zod
**avant** d'appeler le handler : un `replace_notes` sans `confirmed: true` est
rejeté par le protocole, le code métier n'est jamais atteint.

Cela ne prouve pas que l'utilisateur a réellement confirmé — un agent peut
mentir. Mais cela rend l'appel impossible par inadvertance, et tout appel
confirmé est tracé dans le journal.

Même logique pour la journalisation : plutôt que d'appeler `log.record()` dans
chacun des quatre outils — quatre occasions d'oublier — un wrapper enveloppe
tous les handlers. On ne peut pas exécuter un outil sans laisser de trace.

### Les messages d'erreur sont écrits pour un LLM

Le consommateur d'une erreur n'est pas un développeur qui lira une stack trace,
c'est un modèle qui doit corriger son appel tout seul. Un `false` ou un
« invalid input » ne lui apprend rien.

```
A note must start with a category prefix followed by the fact.
Allowed categories: [deadline], [decision], [todo], [info].
Example: "[deadline] The project must be delivered on Friday."
```

Le message rappelle la règle et donne un exemple. L'agent se corrige au coup
suivant sans intervention humaine.

Le même raisonnement vaut pour les descriptions d'outils : elles sont le
**seul** élément sur lequel un modèle s'appuie pour choisir quel outil appeler.
La mention « Always call this first » dans `get_rules` est le premier levier
de comportement, avant même le contenu des règles.

### Une note = une ligne en base

`append_note` fait un `INSERT`, pas un cycle lire → concaténer → réécrire.
Deux agents qui écrivent simultanément ne s'écrasent donc pas : la condition
de course disparaît par construction du modèle de données plutôt que par
verrouillage.

---

## Sécurité

### Deux clés, deux portes

| Variable       | Qui la présente | Ce qu'elle ouvre                          |
| -------------- | --------------- | ----------------------------------------- |
| `MCP_API_KEY`  | les clients MCP | les quatre outils (lecture + écriture)    |
| `VIEW_KEY`     | le navigateur   | la page de consultation, en lecture seule |
| `DATABASE_URL` | le serveur      | Neon — jamais exposée                     |

Le sujet ne demandait qu'une clé partagée. La page de consultation et
l'écriture via MCP n'ayant pas la même sensibilité, les privilèges sont
séparés : compromettre la clé de consultation ne donne aucun droit d'écriture.
Les deux vérifications sont implémentées par des fonctions distinctes, sans
chemin commun qui permettrait à l'une d'ouvrir l'autre.

### Détails d'implémentation

- **Comparaison en temps constant** (`timingSafeEqual`) : une comparaison
  classique s'arrête au premier caractère différent, ce qui laisse fuiter de
  l'information par le temps de réponse. Les longueurs sont vérifiées avant,
  car `timingSafeEqual` exige des buffers de même taille — et une clé de
  longueur différente ferait sinon planter le serveur.
- **L'authentification ne lit jamais le corps de la requête**, uniquement les
  en-têtes et l'URL. Un flux Node ne se lit qu'une fois : toute lecture du
  corps en amont priverait le handler de ses données.
- **Échappement HTML systématique** sur la page de consultation. Le contenu des
  notes et les noms d'agents viennent de clients non contrôlés ; sans
  échappement, une note contenant du balisage serait une faille XSS stockée.
- **Nom d'agent borné à 64 caractères**, puisqu'il est déclaré librement par le
  client.

### Transport de la clé

`Authorization: Bearer <clé>` est la méthode recommandée. Un repli par
paramètre d'URL (`?key=…`) est accepté pour les clients qui ne permettent pas
de configurer un en-tête personnalisé. Ce second mode est **moins sûr** : une
URL se retrouve dans les journaux serveur, l'historique du navigateur et les
outils intermédiaires. Il est documenté comme une concession, pas comme une
option équivalente.

---

## Installation

### Prérequis

Node.js 22+ et un projet Neon.

> TypeScript est épinglé en 6.x : `typescript-eslint` ne supporte pas encore
> TypeScript 7, et forcer l'installation fait échouer le linter à l'exécution.

### Mise en route

```bash
git clone https://github.com/Cecile-Hirschauer/mcp_notepad.git
cd mcp_notepad
npm ci
cp .env.example .env.local
```

Renseigner `.env.local` :

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
MCP_API_KEY=<32 octets aléatoires en hexadécimal>
VIEW_KEY=<24 octets aléatoires en hexadécimal>
```

Générer une clé :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Appliquer le schéma, puis démarrer :

```bash
npm run db:migrate
npm run dev
```

Le serveur écoute sur `http://127.0.0.1:3000/mcp`, la page de consultation sur
`http://127.0.0.1:3000/view?key=…`.

### Scripts

| Commande             | Effet                                                 |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | serveur local avec rechargement                       |
| `npm run verify`     | lint + format + typecheck + tests (ce que fait la CI) |
| `npm test`           | tests seuls, suite Neon ignorée                       |
| `npm run test:db`    | tests incluant la suite Neon                          |
| `npm run db:migrate` | applique `db/schema.sql`                              |

### Déploiement

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add MCP_API_KEY production
npx vercel env add VIEW_KEY production
npx vercel --prod
```

Deux points à vérifier côté Vercel :

- **Deployment Protection** doit être désactivée, sinon le SSO Vercel intercepte
  toutes les requêtes avant qu'elles n'atteignent la fonction.
- Les variables d'environnement ne s'appliquent qu'aux déploiements **suivants** ;
  en ajouter une impose de redéployer.

---

## Brancher un client MCP

### Claude Code

```bash
claude mcp add notepad \
  --transport http \
  -H "Authorization: Bearer <MCP_API_KEY>" \
  -H "X-Agent-Name: claude-code" \
  -- https://mcpnodepad.vercel.app/mcp
```

```bash
claude mcp list
```

### Vérification manuelle

```bash
curl -s -X POST https://mcpnodepad.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer <MCP_API_KEY>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Comportement observé

Invité à ajouter une note, Claude Code enchaîne spontanément :

```
get_rules()    → lit les conventions
read_notes()   → vérifie que l'information n'existe pas déjà
append_note()  → écrit avec le bon préfixe de catégorie
```

Aucune instruction côté client n'est nécessaire : la séquence découle des
descriptions d'outils et des règles elles-mêmes.

---

## Tests et qualité

36 tests, exécutés en CI à chaque push (lint, format, typecheck, tests).

Les tests du serveur MCP pilotent le **vrai** `createMcpHandler` — celui qui est
déployé — via un `Client` MCP connecté en in-process :

```ts
const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
  fetch: (url, init) => handler.fetch(new Request(url, init)),
});
```

Aucune socket, aucun port, aucun mock de transport : le test couvre le chemin
d'exécution réel.

Un test mérite une mention : il vérifie que le message d'erreur **énumère les
catégories autorisées**. Ce n'est pas une assertion de comportement mais de
qualité de l'information renvoyée au modèle — sur un serveur MCP, un message
d'erreur opaque est un défaut fonctionnel.

La suite Neon s'exécute uniquement si `DATABASE_URL` est présente, ce qui
permet de la lancer en local sans secret en CI.

---

## Limites assumées

- **`replace_notes` n'est pas transactionnel.** Le driver HTTP de Neon
  n'enchaîne pas plusieurs instructions dans une transaction. Si l'insertion
  échoue après la suppression, le bloc-notes reste vide.
- **`confirmed: true` n'est pas une preuve de consentement.** Un agent peut le
  passer sans avoir rien demandé. Le mécanisme empêche l'appel accidentel et
  rend l'acte traçable, rien de plus. Une vraie garantie supposerait que la
  confirmation vienne du client MCP hôte, pas du modèle.
- **L'identité de l'agent est déclarative.** `X-Agent-Name` est choisi
  librement par le client. Dans un vrai système, elle devrait dériver de
  l'authentification.
- **Les tests Neon vident la table `notes`.** Base de développement et base de
  test sont confondues. Une branche Neon dédiée résoudrait le problème.
- **La catégorie est stockée dans le préfixe du contenu**, pas dans une colonne.
  Simple, mais inexploitable pour filtrer côté base.
- **Un seul bloc-notes global.** Pas de cloisonnement par projet.

---

## Pistes d'évolution

Par ordre d'utilité décroissante pour un usage réel :

1. **Plusieurs documents** — un bloc-notes par projet, choisi au niveau de la
   connexion MCP plutôt que par un argument d'outil, pour qu'un agent ne puisse
   pas écrire dans le mauvais.
2. **`update_note` / `delete_note`** — un contexte projet doit pouvoir être
   corrigé. Les règles 8 et 9, qui interdisent de réécrire et de supprimer,
   conviennent à un journal d'accumulation mais deviennent nuisibles dès que le
   bloc-notes sert de contexte : une information périmée induit l'agent en
   erreur avec assurance.
3. **Écriture depuis la page web** — aujourd'hui seul un agent peut écrire.
4. **`get_history()`** — exposer le journal comme un outil MCP.
5. **Recherche et filtrage** — `read_notes()` renvoie tout, ce qui sature le
   contexte de l'agent dès que le volume augmente.
6. **OAuth 2.1 et permissions par utilisateur**, en remplacement de la clé
   partagée.

---

## Références

- [Spécification MCP](https://modelcontextprotocol.io/specification)
- [SDK TypeScript v2](https://ts.sdk.modelcontextprotocol.io/v2/)
