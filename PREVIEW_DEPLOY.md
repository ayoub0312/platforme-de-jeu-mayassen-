# Déploiement Preview — feat/partner-spaces

**Statut : branche poussée sur `perso`, rien déployé.** Ce document résume ce qui a été vérifié (lecture seule) et ce qu'il faut réunir avant de lancer un déploiement preview.

## 1. Push effectué

```
git push perso feat/partner-spaces
```

Confirmé après coup :
- `perso/refs/heads/feat/partner-spaces` = `a875e40` (identique au HEAD local).
- `perso/main` inchangé (`e193234`, même commit qu'avant le push).
- Push simple, aucun `--force`, aucun push vers `main`.
- GitHub propose une URL de pull request (`.../pull/new/feat/partner-spaces`) — non ouverte, non créée, laissée à ton appréciation.

## 2. Base ciblée par l'environnement Preview — constat important

`vercel env ls preview` → **aucune variable d'environnement configurée pour Preview.** `vercel env ls` (toutes envs) confirme que les 8 variables existantes (`APP_BASE_URL`, `DATABASE_URL`, `SHARED_API_SECRET`, `SESSION_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `TURSO_AUTH_TOKEN`, `TURSO_DATABASE_URL`) sont **toutes scopées uniquement "Production"** — aucune n'apparaît aussi rattachée à "Preview", ce qui aurait été le signe d'un partage.

Ce n'est donc **pas** le scénario "Preview branché sur la prod" — Preview n'a accès à aucune des deux valeurs Turso/Redis de prod, donc **aucun risque qu'un déploiement preview lise ou écrive sur la base de production**, quelle que soit la façon dont l'app se comporte au runtime.

**Mais ce n'est pas non plus une situation saine pour une démo** : sans `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, le code (`src/lib/db.ts`) retombe sur `DATABASE_URL` (absente aussi en Preview), qui retombe elle-même sur `file:./dev.db` — un fichier SQLite local qui n'existe pas dans le build déployé (`dev.db` est maintenant hors du suivi git, et le filesystem d'une fonction serverless Vercel est de toute façon éphémère et non partagé entre invocations). Concrètement : un déploiement preview aujourd'hui build très probablement avec succès (`prisma generate` n'a besoin que du schéma, pas d'une connexion), mais tournera au mieux sur une base SQLite vide et non migrée à chaque cold start, au pire plantera sur la première requête qui touche la DB. Ce n'est pas dangereux, mais ce n'est pas montrable en l'état.

## 3. Migration automatique au déploiement — reconfirmé

Toujours non, sans changement depuis la dernière vérification :
- `package.json` → `"build": "prisma generate && npm run build:widget && next build"` — pas de `migrate deploy`/`db push`.
- Aucun `vercel.json`, aucun `postinstall`, aucune autre référence à une commande de migration dans le dépôt.
- Un déploiement preview n'appliquerait donc, de toute façon, aucune migration nulle part — ni en prod (impossible, aucun accès), ni sur une éventuelle base preview (il faudrait l'appliquer manuellement, séparément).

## 4. Commande de déploiement preview exacte — non exécutée

```
npx vercel
```

(sans `--prod`, ce qui produit par défaut un déploiement **Preview**, jamais Production). Le projet est déjà lié localement (`.vercel/project.json`), donc cette commande suffit sans configuration supplémentaire — **mais ne doit être lancée qu'après ta validation explicite**, conformément à l'interdit posé.

## 5. Prérequis à réunir avant de lancer ce déploiement

1. **Une base Turso dédiée au preview/staging**, distincte de la base de production — jamais la même. Aucune contrainte ici puisque ce n'est pas de la prod : la migration Phase 1 peut y être appliquée librement (`prisma migrate deploy` contre CETTE base, une fois créée).
2. **Variables d'environnement Preview à ajouter dans Vercel** (`vercel env add <NOM> preview`, action que je n'ai pas effectuée — interdite pour cette tâche) : au minimum `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (pointant vers la base de staging du point 1), `SESSION_SECRET`, `APP_BASE_URL` (peut pointer vers l'URL preview elle-même une fois connue, ou rester approximatif pour une démo). `UPSTASH_REDIS_REST_URL`/`TOKEN` : idéalement une instance Redis séparée aussi — sinon le rate-limiting et le stock de lots resteraient simplement en mémoire locale (dégradé mais pas dangereux, cf. le repli déjà géré par le code).
3. **Ta validation explicite pour lancer `npx vercel`** — pas donnée par ce prompt, qui ne portait que sur le push.
4. Optionnel : un jeu de données de démo dans cette base de staging (campagnes, lots, partenaire) pour que la démo au superviseur ait quelque chose à montrer plutôt qu'une base vide.

## Ce qui reste ouvert

- Décider si la base de staging est une nouvelle base Turso à créer, ou s'il en existe déjà une prévue pour cet usage (à demander).
- Une fois les variables Preview ajoutées, `vercel env ls preview` redeviendra le moyen de confirmer qu'elles sont bien en place avant de déployer — sans jamais en afficher les valeurs.
