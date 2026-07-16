# Checklist de déploiement — feat/partner-spaces

**Statut au moment de la rédaction : rien n'a été poussé, rien n'a été déployé, aucune commande n'a été exécutée contre Turso production.** Ce document résume ce qui a été vérifié (lecture seule) pour préparer une décision, pas pour l'exécuter.

## 1. Remote et projet Vercel cible

```
origin  https://github.com/HZLStudio/obooking-game.git
perso   https://github.com/ayoub0312/platforme-de-jeu-mayassen-.git
```

Projet Vercel lié localement : `ayoub-jrabs-projects/game-myassin` (`prj_qxlIjco7my1Xogf6ildhHWsKMCmB`).

**Constat important, vérifié via `vercel project inspect game-myassin`** : ce projet Vercel **n'a aucun dépôt Git connecté** — la sortie ne contient aucune section Git/Link, seulement Framework/Build Settings. Confirmé aussi par `vercel inspect` sur le dernier déploiement production : aucune métadonnée de commit/source Git associée.

**Conséquence directe** : ni `origin` ni `perso` ne sont reliés à ce projet Vercel. Un `git push` sur l'un ou l'autre **ne déclenche aucun déploiement**. Les déploiements de ce projet se font uniquement via `vercel --prod` lancé manuellement depuis une machine locale, avec les fichiers du répertoire courant au moment de la commande — pas par intégration Git automatique. À vérifier côté dashboard Vercel (Project Settings → Git) si un doute persiste, mais rien dans les commandes CLI disponibles n'indique une connexion existante.

## 2. Base de production visée

`TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` sont bien configurées dans l'environnement Production du projet (confirmé via `vercel env ls`, noms uniquement — voir rapport précédent).

**Non résolu proprement** : obtenir le nom exact de la base sans exposer le token nécessite soit `vercel env pull` (télécharge TOUTES les variables en clair dans un fichier, y compris `TURSO_AUTH_TOKEN` et les autres secrets — bloqué par le classifieur de sécurité, à raison, puisque ça dépasse largement "le nom de la base uniquement"), soit une lecture directe côté Turso (exclue par la consigne de cette tâche). Je n'ai donc pas re-vérifié cette valeur maintenant.

Le nom `platformemayassenjeu` a été mentionné explicitement par l'utilisateur dans le brief initial du chantier multi-tenant ("jamais ... sur la base de production Turso (platformemayassenjeu)") — je le rapporte tel quel comme référence connue, **pas comme une valeur que je viens de confirmer techniquement**. Si une confirmation certaine est nécessaire avant d'agir, la voie sûre est de vérifier dans le dashboard Vercel (qui permet de révéler une variable individuelle sans tout télécharger) plutôt que de me faire matérialiser l'ensemble des secrets.

## 3. Écart de schéma à appliquer (analyse de fichiers uniquement, rien exécuté)

20 migrations existent dans `prisma/migrations/`. Une seule est nouvelle sur cette branche par rapport à ce qui précède (`5cade59`, point de divergence avec `main`) :

```
20260714164227_partner_spaces   ← nouvelle, propre à cette branche
```

Toutes les migrations antérieures (jusqu'à `20260708013000_add_prize_text_color`) sont partagées avec `main` — **l'hypothèse posée ici, non re-vérifiée en direct contre la prod**, est qu'elles y sont déjà appliquées (cohérent avec l'usage habituel du projet, mais je n'ai interrogé aucune table `_prisma_migrations` de prod pour le confirmer, conformément à la consigne « analyse des fichiers uniquement »).

Contenu exact de `20260714164227_partner_spaces` (détail complet déjà dans `MIGRATION_PROD.md`) :
- `Partner` : + `slug` (unique, obligatoire, backfillé depuis `name`), `isActive` (défaut `true`), `email`, `logoUrl`, `primaryColor`, `secondaryColor`.
- `User` : + `partnerId` (optionnelle, FK).
- `SiteSettings` : + `partnerId` (optionnelle, unique, FK).
- `ActivityLog` : + `partnerId` (optionnelle).
- Aucune colonne existante supprimée, renommée ou retypée. Aucune donnée métier (campagnes, lots, gagnants, leads) touchée.

## 4. Risque de migration automatique au déploiement — réponse claire

**Non, un déploiement (git push ou `vercel --prod`) n'appliquerait pas automatiquement la migration de Phase 1 sur la base de production.**

Vérifié précisément :
- `package.json` → `"build": "prisma generate && npm run build:widget && next build"`. `prisma generate` régénère uniquement le client (code), **aucune commande touchant la base** (`migrate deploy` / `db push`) n'y figure.
- Aucun `vercel.json` dans le repo (pas de build/install command personnalisée qui pourrait en ajouter une).
- Aucune occurrence de `migrate deploy`, `db push`, `postinstall`, ou `vercel-build` nulle part dans le dépôt (recherche exhaustive, hors `node_modules`).
- Combiné au constat du §1 (aucun remote connecté à Vercel), il y a en réalité **deux barrières indépendantes** : le push ne déclenche même pas de déploiement, et même un déploiement manuel ne lancerait aucune migration.

La migration reste un acte **volontaire et séparé**, à faire suivre exactement les étapes de `MIGRATION_PROD.md`.

## 5. Ordre d'opérations sûr

Le code de Phase 1/2 (schéma Prisma régénéré, `loginAdmin`, procédures promues) **suppose que les nouvelles colonnes existent** — il n'y a aucun repli si `User.partnerId`/`Partner.slug` etc. sont absents en base. Déployer le nouveau code avant la migration ferait échouer ces requêtes en production dès le premier appel (`no such column`). C'est exactement le scénario que le brief initial du chantier voulait éviter ("un déploiement du code sans migration prod = panne garantie, déjà arrivé").

**Ordre correct : migration d'abord, code ensuite — jamais l'inverse.**

1. Backup de la base de production (`MIGRATION_PROD.md`, étape 0).
2. Vérification d'absence de collision de slug (étape 1).
3. Application du SQL de migration en prod (étape 2) — feu vert superviseur requis, action distincte du déploiement du code.
4. Backfill `User.partnerId` (étape 3) — redevenu un accélérateur plutôt qu'un prérequis strict grâce à l'auto-guérison ajoutée en Phase 2, mais toujours recommandé de le faire proactivement plutôt que de compter sur l'auto-guérison sous trafic réel.
5. Vérifications post-migration (étape 4).
6. Seulement à ce stade : déployer le code — via connexion d'un remote à Vercel + push, ou via `vercel --prod` manuel comme c'est fait aujourd'hui pour ce projet. Feu vert superviseur requis pour cette action, séparément de celui de la migration.
7. Rappel d'un aléa déjà rencontré cette session : `vercel --prod` ne met pas toujours à jour automatiquement l'alias production existant pour tous les domaines personnalisés (`vercel alias set` peut être nécessaire ; `gift.obooking.tn` n'était pas gérable en CLI faute de permission).

## 6. Rollback si le déploiement casse le site

- **Rollback du code** : trivial côté Vercel — chaque déploiement passé reste disponible ; repromouvoir l'ancien déploiement en Production (dashboard, ou re-déploiement de l'ancien commit/build). Aucune action base de données requise pour ça seul.
- **Compatibilité ascendante de la migration** : toutes les nouvelles colonnes sont optionnelles et aucune colonne existante n'est modifiée — l'**ancien** code (généré avant cette migration) continue de fonctionner normalement même après que la migration soit appliquée en prod, puisqu'il n'interroge jamais les nouvelles colonnes. Ça veut dire qu'un rollback du code seul, migration déjà appliquée, est sans danger.
- **Si le problème vient de la migration elle-même** (échec en cours d'application, collision de slug non détectée à temps malgré la vérification de l'étape 1) : restaurer depuis le backup pris à l'étape 0 — ne pas tenter de corriger à la main en direct sur la prod.
- Règle générale : ne jamais appliquer la migration et déployer le code dans la même fenêtre sans backup frais, et sans avoir déjà testé la séquence complète en local (fait : migration + Phase 2 testées en local avant ce document).

## Ce qui reste ouvert / à faire confirmer

- Nom exact de la base Turso de prod : à confirmer via le dashboard Vercel, pas via une commande qui matérialiserait tous les secrets.
- Quel remote (`origin` ou `perso`) est le "bon" pour ce projet reste sans objet tant qu'aucun des deux n'est connecté à Vercel — si l'intention est un jour de connecter un remote pour des déploiements automatiques, ce sera une décision et une action séparées (`vercel git connect`), non prise ici.
- Aucune vérification live de l'état réel de `_prisma_migrations` en prod (délibérément, par respect de la consigne "analyse des fichiers uniquement") — si un doute existe sur ce qui est vraiment déjà appliqué, une requête en lecture seule serait la façon de le lever avant d'exécuter quoi que ce soit.
