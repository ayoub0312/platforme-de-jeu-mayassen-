# Obooking Gift

Plateforme de jeux-concours en marque blanche (roulette + tirage au sort) permettant à une agence de
voyage de déployer des mécaniques de gamification chez ses partenaires B2B (hôtels, boutiques, sites
partenaires) afin de générer des leads qualifiés.

## Rôles

- **SUPERADMIN** — accès total : tous les partenaires, campagnes, lots, utilisateurs, réglages globaux.
- **PARTNER** — accès restreint à ses propres campagnes, leads, gagnants et statistiques (filtré côté serveur).
- **PLAYER** — le joueur final : inscription, participation au jeu, parrainage, voucher de gain.
- **READONLY** — accès admin en lecture seule (bloqué sur toute mutation).

## Stack technique

- **Framework** : Next.js 16 (App Router) + React 19 + TypeScript strict
- **Style** : Tailwind CSS v4 (`@theme` dans `globals.css`), design system maison dans `src/components/ui/`
- **API** : tRPC + Hono (montés sur `/api/[[...route]]`, runtime Node.js)
- **Base de données** : Prisma 7 + Turso (libSQL) — repli automatique sur SQLite local (`dev.db`) si les
  variables Turso ne sont pas configurées
- **Cache & concurrence** : Upstash Redis (rate limiting + décrément atomique du stock des lots) — repli
  automatique sur un store en mémoire locale en développement
- **Animations** : Framer Motion
- **Graphiques** : Recharts (tableau de bord admin)
- **Drag & drop** : @dnd-kit (segments de roulette, bannières de la page d'accueil)
- **Export** : xlsx (CSV/Excel), jspdf (bon d'achat en PDF), qrcode
- **Email** : nodemailer (notification de gain, depuis l'adresse Gmail propre à chaque partenaire ou une
  adresse par défaut configurable dans Réglages)

## Logique métier critique — `spinRoulette`

Le tirage de la roulette est entièrement calculé côté serveur (jamais dans le navigateur), pour éviter
toute triche :

1. **Rate limiting** (Upstash Redis) — bloque les clics rapprochés (< 2s).
2. **Éligibilité** — vérifie qu'un jeton de jeu (`PlayToken`) non utilisé et non expiré existe.
3. **RNG sécurisé** — `crypto.getRandomValues()`, jamais `Math.random()`.
4. **Verrouillage atomique du stock** (Redis `hincrby`) — bascule vers un lot de consolation si le stock
   vient d'être épuisé, avec compensation si l'écriture en base échoue ensuite.
5. **Persistance transactionnelle** (Prisma `$transaction`) — jeton consommé + gain enregistré en une
   seule opération atomique.

Ce fichier (`spinRoulette` dans `src/server/routers/_app.ts`) ne doit jamais être modifié sans repasser
en revue ces cinq points.

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner les variables nécessaires (voir ci-dessous)
npx prisma migrate dev # applique les migrations sur la base locale
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Voir `.env.example` pour la liste complète. Résumé :

| Variable | Requis | Rôle |
|---|---|---|
| `DATABASE_URL` | Non (défaut `file:./dev.db`) | Base SQLite locale |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Non | Base Turso distante (production) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Non (repli mémoire locale) | Rate limiting + stock atomique |
| `APP_BASE_URL` | Recommandé | Base des liens générés dans les emails |
| `SESSION_SECRET` | Recommandé (obligatoire en prod) | Signature des sessions admin + chiffrement des mots de passe SMTP |
| `SHARED_API_SECRET` | Non | Secret partagé avec le site vitrine Obooking |

La validation de ces variables au démarrage se fait dans `src/env.ts` (avertissements clairs en console,
jamais bloquant grâce aux replis déjà en place).

## Scripts

```bash
npm run dev     # serveur de développement (Webpack)
npm run build   # build de production (Prisma generate + widget + Next build, Turbopack)
npm run start   # sert le build de production
npm run lint    # ESLint
```

## Structure

```
src/
  app/                    # Routes App Router
    page.tsx              # Accueil public (agrégateur toutes campagnes)
    company/[id]/          # Page marque blanche par partenaire
    partner/               # Back-office (admin/partenaire)
    voucher/[id]/           # Bon d'achat d'un gain
    api/[[...route]]/      # Hono + tRPC
  components/
    ui/                    # Design system (Button, Card, Modal, Toast, DataTable...)
    admin/                 # Layout admin, tableau de bord, wizard de campagne, onglets
    campaign-portal/       # Parcours joueur (roue, tirages, parrainage, défis)
    campaign-config/       # Éditeurs de segments roulette / lots tirage
  server/routers/_app.ts   # Routeur tRPC unique (toutes les procédures)
  lib/                     # Prisma, Redis, auth (sessions signées), chiffrement, email
  env.ts                   # Validation Zod des variables d'environnement
prisma/
  schema.prisma
  migrations/
```

## Design system

Palette et typographie définies dans `src/app/globals.css` (`@theme`) : couleurs `brand-*` (orange
signature), `ink-*` (texte), `surface-*`, `success/danger/warning/info`. Titres en Clash Display
(auto-hébergée dans `src/fonts/`), corps en Inter. Composants réutilisables dans `src/components/ui/`.

## Notes de conception

- La vidéo hero de la page d'accueil et le moteur `spinRoulette` sont des zones sensibles — ne pas les
  modifier sans comprendre pleinement leur fonctionnement (voir commentaires dans le code).
- `EarnMethod.RECEIPT_UPLOAD` (scan de ticket de caisse) est une fonctionnalité active, pas du code mort.
- Le filtrage par rôle (PARTNER ne voit que ses données) est appliqué côté serveur dans chaque procédure
  tRPC concernée — ne jamais filtrer uniquement côté client.
