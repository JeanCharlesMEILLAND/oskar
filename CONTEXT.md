# 📍 CONTEXT — Où on en est (snapshot du 2026-04-29)

> **Pour l'IA qui reprend le projet** (Claude Code, Cursor chat, etc.) : lis d'abord `HANDOFF.md` pour le contexte complet du jeu et de la roadmap. Ce fichier-ci résume **uniquement l'état de la session en cours**.

---

## 🎯 Décision architecturale prise

On part sur **Next.js + Neon Postgres + déploiement Vercel**, ce qui revient à fusionner les Phase 1, 2 et 3 du roadmap du `HANDOFF.md` en une seule.

Raisons du choix :
- une seule migration au lieu de deux,
- intégration native Vercel ↔ Neon,
- API routes dispo dès le départ pour valider les scores côté serveur (anti-triche minimal).

## ✅ Ce qui est déjà fait

| Élément | Emplacement | Statut |
|---|---|---|
| `.env.local` (string Neon) | `C:\Users\jcmei\Desktop\Oskar\.env.local` | ✅ |
| `.gitignore` (avec `.env*` exclu) | `C:\Users\jcmei\Desktop\Oskar\.gitignore` | ✅ |
| MCP `magic` (21st.dev) | `~/.claude.json` (scope user, Claude Code) | ✅ Connected |
| MCP côté Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` | ⚠️ aussi installé (à ignorer si pas utilisé) |

## ⏳ Ce qu'il reste à décider AVANT de scaffolder

L'utilisateur n'a pas encore tranché ces 4 points. Recommandations en gras :

1. **App Router** ou Pages Router ? → reco : **App Router**
2. **TypeScript** ou JS ? → reco : **TypeScript**
3. **Drizzle** ou Prisma comme ORM Neon ? → reco : **Drizzle** (plus léger, mieux pour serverless)
4. Stratégie pour migrer le jeu existant :
   - **(A) Wrapper rapide** : on met le JS du jeu dans un `<GameCanvas />` client-only, on remplace `window.storage` par des appels `fetch('/api/...')`. ~1-2 soirées.
   - **(B) Réécriture progressive** : on découpe selon l'arbo proposée dans `HANDOFF.md` § 5. ~3-5 jours.
   - reco : **(A)** — on ship vite, on refactore après.

L'utilisateur peut juste dire « **OK reco** » pour tout valider.

## 🚧 Prochaine action concrète

Une fois les 4 décisions confirmées :

1. `npx create-next-app@latest .` (App Router + TS si reco validée)
2. Installer Drizzle + driver Neon : `npm i drizzle-orm @neondatabase/serverless` + `npm i -D drizzle-kit`
3. Créer `db/schema.ts` avec les tables : `accounts`, `friendships`, `friend_requests`, `rank_entries`, `event_state`
4. Wrapper le jeu dans `app/page.tsx` ou `components/GameCanvas.tsx` (option A)
5. Remplacer les 12 occurrences de `window.storage` (lignes 418-461 de `gra_zolwiki_v10.html`) par des appels API
6. Tester localement → push GitHub → connecter Vercel → DNS

## 🔴 Sécurité — secrets à tourner AVANT push GitHub

Les deux secrets suivants ont été collés en clair dans le chat **et sont donc fuités** :

- **Clé API 21st.dev** (utilisée par le MCP `magic`)
- **Mot de passe Neon DB** (utilisé dans `.env.local` sous `DATABASE_URL`)

L'utilisateur a explicitement dit : *« utilise ces secret on les changeras plustard »*. Donc :
- ⚠️ **Aucun push GitHub tant que les secrets ne sont pas tournés.**
- Quand ils seront tournés :
  1. Mettre à jour `.env.local` avec la nouvelle `DATABASE_URL`
  2. Reconfigurer le MCP : `claude mcp remove magic -s user` puis `claude mcp add magic --scope user --env API_KEY=NOUVELLE_CLE -- npx -y @21st-dev/magic@latest`
  3. Pour Cursor : `npx @21st-dev/cli@latest install cursor --api-key NOUVELLE_CLE`

## 🛠️ Si l'utilisateur ouvre Cursor au lieu de Claude Code

- Le dossier projet est intact, Cursor le voit normalement.
- La mémoire Claude Code (`~/.claude/...`) **n'est pas lue par Cursor**.
- Les MCP de Claude Code **ne sont pas partagés** avec Cursor (Cursor utilise `~/.cursor/mcp.json`).
- Pour retrouver la session avec mémoire complète : ouvrir le terminal intégré de Cursor (Ctrl+\`) et taper `claude --continue`.

## 👤 Rappel utilisateur

- **Jean-Charles** ("papa") : pilote la technique, à l'aise avec OVH/Hostinger/Strapi, communication en français.
- **Oskar** (~7-8 ans) : pilote le créatif (classes, événements, design), polonophone-francophone, ses requêtes en polonais sont à prendre au sérieux comme features réelles.
- Stack imposée : **vanilla JS pour la logique du jeu**, pas de Redux/Zustand. TS + Next OK pour l'enveloppe et le backend.

---

*Snapshot écrit par Claude (Opus 4.7) avant que l'utilisateur passe sur Cursor.*
