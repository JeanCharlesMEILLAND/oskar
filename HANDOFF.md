# 🐢 Żarłoczne Żółwie — Document de passation pour Claude Code

> **Pour qui :** Jean-Charles (papa) qui va continuer le projet de son fils Oskar dans Claude Code, en vue d'un déploiement sur **zarlocznezolwie.com**.

---

## 1. Contexte du projet

Oskar (fils, ~7-8 ans, francophone-polonophone) construit avec Claude (chat) un jeu HTML monofichier depuis ~10 itérations. La dernière version stable est **v10** (~2600 lignes, un seul fichier HTML). Oskar vient d'acheter le domaine **zarlocznezolwie.com** et veut y héberger le jeu.

**Le fichier final actuel : `gra_zolwiki_v10.html`** — c'est le point de départ de la suite du travail.

---

## 2. Ce que fait le jeu actuellement

### Mécanique de base
- Tortue qui se déplace sur une carte 2× plus grande que la viewport, mange des salades, évite les cailloux
- 3 modes : **Solo** (60s, objectif 10 salades), **Duo** (60s, deux joueurs même clavier), **Endless** (survie, le score = secondes survécues)
- Carte 1280×800 px, viewport 640×400 px, caméra qui suit avec lerp
- Combo system (×2 à 3 salades, ×3 à 5), particles, sons WebAudio synthétisés

### Système de comptes
- Inscription / connexion avec mot de passe (hash DJB2 + sel — basique, c'est OK pour un jeu d'enfant)
- Le compte stocke : monnaie, classes possédées, classe sélectionnée, records, achievements, daily, stats, avatar, friends, friendRequests, totalEverEaten (XP)
- **Storage actuel** : `window.storage` de l'API Anthropic — c'est ce qu'il faut migrer pour le déploiement (voir section 6)

### 34 classes de tortues
Réparties en 5 raretés avec prix progressifs :
- **basic** (100 🥬) — 9 classes
- **rare** (150 🥬) — 12 classes
- **epic** (200 🥬) — 6 classes
- **legendary** (300 🥬) — 3 classes
- **limited** (1500 / 3000 / 5000 / 10000 🥬) — 4 classes (VIP / SVIP / GVIP / Zulwio Bogacz)

Chaque classe a : speed, points multiplier, lives, magnet (rayon), dodge (proba esquive), bonusTime, bounce, freezeRocks, rainbow.

### Power-ups (apparaissent toutes les 13s)
- 🍅 Tomate (+5s en mode chronométré, +5 monnaies en endless)
- ⭐ Étoile (5s d'invincibilité)
- 🍓 Fraise (aimant global 3s)
- 💣 Bombe (efface tous les cailloux)

### Événements
Système admin (code `oskar843`) qui déclenche des événements 5 minutes pour TOUS les joueurs (synchronisé via storage partagé) :
- **Event 2×** — points doublés + 10% de salades dorées (×10 points)
- **Pluie de salades** — nouvelle salade toutes les 0.5s

### Achievements (15 médailles)
+30 monnaies par médaille débloquée. Les triggers sont vérifiés dans `endGame()` et `checkAchAfterAction()`. Quand on a TOUTES les médailles, on devient **Master** — débloque l'avatar arc-en-ciel sur le profil.

### Daily Challenge
Un défi par jour (déterministe selon la date), récompense 100 monnaies. 7 types : score solo, wins solo, combo, powerups, gold salads, endless seconds.

### Profil & social (dernière itération)
- Avatar SVG 8 couleurs (le 8e = arc-en-ciel, débloqué par Master Badge)
- Niveau de tortue (1-100, basé sur XP cumulé = `totalEverEaten`)
- Système d'amis : envoyer une invitation à un autre compte par nom, l'autre l'accepte/refuse
- En duo, on peut choisir un ami → la tortue jaune utilise **sa classe sélectionnée** au lieu de la `normal`

### Sauvegarde locale
Bouton "💾 Zapisz konto" dans le lobby qui exporte le compte en JSON, et bouton "📂 Wczytaj konto" sur l'écran d'auth qui importe. Backup manuel pour ne rien perdre quand le storage Anthropic se réinitialise.

---

## 3. Architecture du fichier monolithique

Tout est dans un seul `.html` :
- `<style>` : variables CSS (couleurs, border-radius)
- `<div id="root">` : conteneur principal, tout est rendu en `innerHTML`
- `<script>` : ~2400 lignes de JS vanilla, un IIFE

### Composants principaux du JS
```
Constantes:        SESSION_KEY, ACCOUNTS_KEY, RANK_*, EVENT_KEY, ACHIEVEMENTS,
                   DAILY_CHALLENGES, POWERUP_TYPES, RARITY, CLASSES,
                   AVATAR_PRESETS, MAX_SPEED_MULT
État global:       session, accounts, rankSolo/Duo/Endless, eventState, player,
                   screen, authMode, shopFilter, evtChk, pendingAchievements,
                   duoFriend
Storage:           load(), saveAccounts(), savePlayer(), saveSession(),
                   saveRankings(), saveEvent()
Auth:              hashPw(), makeSalt(), tryLogin(), tryRegister(), logout()
Friends:           sendFriendRequest(), acceptFriendRequest(),
                   declineFriendRequest(), removeFriend(), hasMasterBadge()
Backup:            exportAccount(), importAccount()
Helpers:           t() (i18n), levelFromXp(), todayKey(), getTodaysChallenge(),
                   ensureDaily/Ach(), unlockAch(), checkAchAfterAction(),
                   checkVipMaster(), getVipBadge(), avatarSvg()
Render screens:    renderAuth(), renderLobby(), renderShop(),
                   renderLimitedShop(), renderAchievements(), renderProfile(),
                   renderFriends(), renderDuoChoose(), renderGame()
Game loop:         startGame() (énorme — ~700 lignes, tout est dedans)
                   - init(), update(), draw(), tick(), loop()
                   - drawTurtle(), drawLettuce(), drawRock(), drawPowerup(),
                     drawMapBg(), drawDeath()
                   - moveTurtle(), updateCamera(), spawnLettuce/Rock/Powerup()
                   - playAm/Hit/Bek/Win/Combo() — sons WebAudio
Routing:           render() — switch sur la variable `screen`
```

### Bilingue PL/FR
Tout passe par `t()` qui lit `T_LANG[session.lang]`. Deux objets `pl` et `fr` complets dans la constante `T_LANG`. Oskar utilise principalement le polonais.

---

## 4. État connu et bugs/limitations

### Ce qui marche bien
- Toute la mécanique de jeu (3 modes, particles, combo, power-ups, events)
- Animation de tortue 4-directionnelle (v10) avec rotation propre
- Visibilité améliorée (v10) : herbe contrastée, salades avec contour blanc, cailloux 3D
- Système d'amis fonctionne **dans le même navigateur** (deux comptes peuvent s'ajouter)
- Backup/restore JSON marche

### Limitations actuelles à connaître
1. **`window.storage` ne fonctionne QUE sur Anthropic** — bloquant pour le déploiement
2. Les amis "globaux" (visible cross-device) ne sont pas possibles avec le storage Anthropic, encore moins sur un domaine externe sans backend
3. Le hash de mot de passe est faible (DJB2 + sel) — acceptable pour un jeu d'enfant entre amis, **pas acceptable pour de vrais comptes en production**
4. Pas de modération du contenu (noms d'utilisateurs, etc.)
5. Pas de rate-limiting, pas de protection contre les bots
6. La logique anti-triche est inexistante — toutes les valeurs (monnaies, records) sont modifiables côté client
7. La fonction `startGame()` est beaucoup trop grosse (~700 lignes) — devrait être éclatée
8. Variables qui se chevauchent dans certaines closures (j'ai vu un duplicate `let globalMagnet` que j'ai corrigé en v9)
9. CSS inline partout — pas de séparation propre style/comportement
10. Pas de TypeScript (vanilla JS), pas de tests

### Régressions à surveiller
- En v9, j'ai changé le comportement du duo pour que le vert utilise la classe du joueur (avant c'était toujours `normal`). Bien tester que les classes en duo se comportent comme prévu.
- En v10, j'ai ajouté la rotation 4-directionnelle. Sur certaines transitions diagonale → vertical, il peut y avoir un saut visuel. Pas grave mais à noter.

---

## 5. Suggestions techniques pour la suite

### Priorité 1 : Refactoring avant production
Le fichier monolithique de 2600 lignes ne va pas tenir. Découpe à proposer :

```
zarlocznezolwie/
├── public/
│   ├── index.html            (squelette)
│   └── assets/
├── src/
│   ├── main.ts               (entry)
│   ├── i18n/
│   │   ├── pl.ts
│   │   └── fr.ts
│   ├── game/
│   │   ├── Game.ts           (boucle principale)
│   │   ├── Turtle.ts         (entité joueur)
│   │   ├── Lettuce.ts
│   │   ├── Rock.ts
│   │   ├── Powerup.ts
│   │   ├── Particle.ts
│   │   └── render/
│   │       ├── drawTurtle.ts
│   │       ├── drawMap.ts
│   │       └── ...
│   ├── data/
│   │   ├── classes.ts        (les 34 classes)
│   │   ├── achievements.ts
│   │   ├── powerups.ts
│   │   └── rarities.ts
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── Auth.ts
│   │   │   ├── Lobby.ts
│   │   │   ├── Shop.ts
│   │   │   ├── LimitedShop.ts
│   │   │   ├── Achievements.ts
│   │   │   ├── Profile.ts
│   │   │   ├── Friends.ts
│   │   │   └── DuoChoose.ts
│   │   └── router.ts
│   ├── audio/
│   │   └── synth.ts          (WebAudio)
│   ├── storage/
│   │   ├── ILocalStorage.ts  (interface abstraite)
│   │   ├── LocalAdapter.ts   (localStorage du navigateur)
│   │   └── ApiAdapter.ts     (futur backend HTTP)
│   └── types.ts
├── package.json
├── tsconfig.json
├── vite.config.ts            (recommandé pour le dev rapide)
└── HANDOFF.md                (ce document)
```

Stack proposée :
- **Vite** pour le bundling (très rapide, zero config pour HTML statique)
- **TypeScript** (au minimum pour `types.ts` qui définit Player, Account, Class, Achievement)
- Pas de framework UI nécessaire (le DOM est rendu manuellement, on peut continuer comme ça ou passer à Preact si on veut)

### Priorité 2 : Couche storage abstraite

Créer `IStorage` en interface :

```typescript
interface IStorage {
  get(key: string, shared?: boolean): Promise<{key, value, shared} | null>
  set(key: string, value: string, shared?: boolean): Promise<void>
  delete(key: string, shared?: boolean): Promise<void>
  list(prefix?: string, shared?: boolean): Promise<string[]>
}
```

Implémentations :
- **LocalStorageAdapter** — localStorage du navigateur (ignore `shared`, tout est local)
- **ApiAdapter** — appels HTTP vers le backend

Switch via env var. **C'est le changement minimum pour mettre en ligne dès demain en mode "tout local"**.

### Priorité 3 : Backend (si on veut vraiment du multi-joueur cross-device)

Si Oskar veut vraiment que ses amis Janek (à Varsovie) et Marek (à Cracovie) le voient comme ami, il faut un backend. Options :

1. **Strapi** (déjà connu, déjà sur OVH/Hostinger). Modèles : `Account`, `Friendship`, `RankEntry`, `EventState`. JWT pour auth. Quick win.
2. **Supabase** (Postgres managed + auth + realtime). Encore plus rapide à mettre en place. Le realtime serait cool pour voir les amis en ligne.
3. **Cloudflare Workers + KV** (cheap, simple). Si on veut zéro infra à gérer.

Pour Oskar et ses 5 copains, **Supabase free tier** est probablement le meilleur compromis (pas d'infra, l'auth gérée, real-time gratuit jusqu'à 2 connexions simultanées).

⚠️ **Si on fait un vrai backend, refaire le hash de mot de passe** (bcrypt côté serveur).

### Priorité 4 : Hardening anti-triche minimal

Pour un jeu d'enfants ça n'a pas besoin d'être parfait, mais :
- Les records et achievements devraient être validés côté serveur (recalculés à partir d'événements de jeu, pas écrits direct)
- Throttling : un compte ne peut pas gagner plus de X monnaies par heure
- Validation des friend requests (pas de spam)

### Priorité 5 : PWA + mobile

Le jeu marche déjà bien en mobile (canvas responsive), mais :
- Ajouter un `manifest.json` pour pouvoir installer comme app
- Ajouter un service worker pour fonctionner offline (sauf le multijoueur)
- Contrôles tactiles : croix directionnelle virtuelle pour mobile (actuellement c'est clavier-only)

---

## 6. Roadmap suggérée

### Phase 1 — Mise en ligne MVP (1 journée)
1. ✂️ Créer un repo Git, déposer `gra_zolwiki_v10.html` comme `index.html`
2. 🔄 Remplacer `window.storage` par `localStorage` (chercher/remplacer, ~10 occurrences)
3. 🌐 Déployer sur Hostinger ou Vercel (drag-drop d'un fichier HTML, c'est trivial)
4. 🎯 Pointer `zarlocznezolwie.com` vers le hosting (DNS A record ou CNAME)

→ **Résultat** : Oskar peut envoyer le lien à ses copains, chacun joue dans son coin avec son propre compte.

### Phase 2 — Refactoring (2-3 jours)
1. Setup Vite + TypeScript
2. Découper le fichier en modules selon l'arbo proposée
3. Créer l'interface `IStorage` et le `LocalStorageAdapter`
4. Tests de non-régression : tous les screens fonctionnent, le jeu se lance

### Phase 3 — Backend Supabase (1-2 jours)
1. Créer projet Supabase
2. Schéma : `accounts`, `friendships`, `friend_requests`, `rank_entries`, `event_state`
3. Implémenter `ApiAdapter` qui parle à Supabase
4. Migration de l'auth vers Supabase Auth (anonymous + nom personnalisé)
5. Tester avec deux comptes sur deux appareils différents

### Phase 4 — PWA + mobile (1 jour)
1. `manifest.json` + icônes
2. Service worker pour cache statique
3. Croix directionnelle tactile
4. Test sur iPad/Android

### Phase 5 — Nice to have (au choix)
- Système d'éditeur de niveau (Oskar voulait ça à un moment)
- Animations de mort plus dramatiques
- Cosmétiques (chapeaux, accessoires) débloquables
- Saisons / battle pass mensuel
- Mode coopératif (vs compétitif) en duo

---

## 7. Recommandations spécifiques pour Claude Code

Quand papa ouvre Claude Code dans le dossier du projet :

### Premier prompt suggéré
> Lis HANDOFF.md d'abord. C'est le contexte complet d'un jeu HTML monofichier que mon fils a construit avec Claude (chat). On est en Phase 1 du roadmap. Première tâche : déposer gra_zolwiki_v10.html comme index.html, remplacer window.storage par localStorage, et tester en local.

### Choses à dire à Claude Code dès le début
- Oskar a 7-8 ans, l'interface utilisateur est en polonais (langue principale) avec FR en backup. **Ne casse pas les chaînes i18n.**
- Les noms de variables sont en anglais mais commentaires souvent en polonais. C'est OK.
- Le code est volontairement simple et lisible. **N'introduis pas de Redux/Zustand/etc.** Vanilla JS reste le but.
- Les classes de tortues sont **équilibrées** (j'ai pas mal grindé là-dessus). Ne change pas les stats sans raison.

### Pièges connus
- Les achievements sont vérifiés à plusieurs endroits — `endGame()` ET `checkAchAfterAction()` ET `checkVipMaster()`. Si tu ajoutes un achievement, vérifie partout.
- Le `evtChk` setInterval est nettoyé dans `logout()` mais peut fuiter si on relance `load()` deux fois — l'ai déjà patché mais surveille.
- Dans `startGame()`, beaucoup de variables sont en closure. Quand tu refactores, fais attention aux références à `t1`, `t2`, `score1/2`, `combo1/2`, `lives1/2`, etc.

---

## 8. Fichiers à embarquer

Dans le repo de départ, mettre :
- ✅ `HANDOFF.md` (ce document)
- ✅ `gra_zolwiki_v10.html` → renommer en `index.html` ou `legacy.html`
- 📝 `README.md` minimal (titre, description, comment lancer en dev)
- 📝 `LICENSE` (MIT ou autre, à votre convenance — c'est un jeu personnel donc pas critique)
- 📝 `.gitignore` (`node_modules`, `dist/`, `.env`)

---

## 9. Communication avec Oskar

Oskar pilote le projet sur le plan créatif (idées, classes, événements, design des visuels). Quand il dit "tata fait" il veut dire qu'il veut que **toi** (papa) fasses la partie technique compliquée. Ses requêtes sont en polonais, parfois mal orthographiées. Ce sont **des features réelles, pas du bruit** — il faut les prendre au sérieux.

Quelques idées qu'il a déjà eues et qu'on n'a pas encore implémentées :
- Plus de fonts/styles différents pour les avatars
- Stats globales (top joueur de la semaine, etc.)
- Plus d'événements spéciaux (Halloween, Noël, anniversaire d'Oskar...)
- Mode tournoi entre amis

Il va probablement avoir d'autres idées en cours de route. Reste flexible.

---

## 10. Pour lancer la conversation dans Claude Code

```bash
cd ~/projects/zarlocznezolwie
# Place gra_zolwiki_v10.html et HANDOFF.md ici
git init
git add .
git commit -m "Initial: jeu monofichier de Oskar (v10) + handoff doc"

# Lance Claude Code
claude
```

Premier message à Claude Code :
> Hi Claude. Lis HANDOFF.md — c'est le contexte. On va faire la Phase 1 du roadmap : mettre le jeu en ligne sur zarlocznezolwie.com avec localStorage. Propose-moi un plan d'action concret en 5-10 étapes avant de coder.

---

**Bon courage Jean-Charles, et bravo Oskar ! 🐢💎**

*Document généré le 29 avril 2026 par Claude (Opus 4.7) via claude.ai après ~10 itérations de jeu avec Oskar.*
