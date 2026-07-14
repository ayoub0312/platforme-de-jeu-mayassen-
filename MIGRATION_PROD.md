# Migration `partner_spaces` — à appliquer manuellement en production

**Cette migration n'a jamais été exécutée contre la base de production
(`platformemayassenjeu`, Turso). Elle a été appliquée et vérifiée uniquement
sur `dev.db` en local.** Ce document donne le SQL exact et la procédure pour
l'appliquer vous-même, quand vous serez prêt.

Fichier source : `prisma/migrations/20260714164227_partner_spaces/migration.sql`

## Ce que fait cette migration

- `Partner` : ajoute `slug` (unique, obligatoire), `isActive` (défaut `true`), `email`, `logoUrl`, `primaryColor`, `secondaryColor`.
- `User` : ajoute `partnerId` (optionnel, FK vers `Partner`).
- `SiteSettings` : ajoute `partnerId` (optionnel, unique, FK vers `Partner`).
- `ActivityLog` : ajoute `partnerId` (optionnel).
- Backfill inclus dans le SQL : génère un `slug` pour chaque `Partner` existant à partir de son `name` (minuscules, espaces → tirets).
- Aucune donnée existante n'est supprimée. Aucune colonne existante n'est renommée ou retypée.

## Étape 0 — Sauvegarde

Avant toute chose, exportez un dump/snapshot de la base de production (Turso permet un export via `turso db shell platformemayassenjeu ".dump" > backup_avant_partner_spaces.sql`, ou utilisez la sauvegarde automatique de votre plan Turso). Ne continuez pas sans un backup récent.

## Étape 1 — Vérifier qu'aucune collision de `slug` ne va se produire

Le nouveau champ `Partner.slug` est **unique**. La formule de backfill (`lower(replace(trim(name), ' ', '-'))`) peut produire le même slug pour deux partenaires aux noms proches (ex: "Obooking Nord" et "Obooking-Nord" donneraient tous deux `obooking-nord`). Avant d'exécuter la migration, lancez cette requête en lecture seule sur la production :

```sql
SELECT lower(replace(trim(name), ' ', '-')) AS slug, COUNT(*) AS n, GROUP_CONCAT(id) AS ids
FROM Partner
GROUP BY slug
HAVING n > 1;
```

- **Si elle ne renvoie aucune ligne** : passez à l'étape 2 telle quelle.
- **Si elle renvoie des lignes** : notez les `id` concernés. Après la migration (qui échouera si vous ne corrigez rien à cause de la contrainte unique), il faudra soit renommer un des partenaires avant de relancer, soit adapter la ligne `INSERT INTO "new_Partner"` du SQL ci-dessous pour ajouter un suffixe (ex: `|| '-' || substr(id, 1, 4)`) sur les lignes en collision.

## Étape 2 — Appliquer le SQL

Deux façons de faire, au choix :

**Option A (recommandée) : `prisma migrate deploy`**, exécuté par vous-même (pas par moi), connecté à la production :

```bash
TURSO_DATABASE_URL="<url prod>" TURSO_AUTH_TOKEN="<token prod>" DATABASE_URL="<url prod libsql>" npx prisma migrate deploy
```

Cela applique uniquement les migrations non encore enregistrées comme appliquées dans `_prisma_migrations` côté prod — donc uniquement `20260714164227_partner_spaces` si tout le reste est déjà à jour.

**Option B : exécuter le SQL directement** (via `turso db shell` ou le dashboard Turso) — copiez-collez le contenu exact de `prisma/migrations/20260714164227_partner_spaces/migration.sql` :

```sql
-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "partnerId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "allowedDomains" TEXT NOT NULL
);
INSERT INTO "new_Partner" ("allowedDomains", "id", "name", "slug") SELECT "allowedDomains", "id", "name", lower(replace(trim("name"), ' ', '-')) FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT,
    "heroVideoData" TEXT,
    "heroVideoMimeType" TEXT,
    "heroPosterData" TEXT,
    "heroPosterMimeType" TEXT,
    "referralBonusSpins" INTEGER NOT NULL DEFAULT 2,
    "defaultSenderEmail" TEXT,
    "defaultSenderEmailPassword" TEXT,
    CONSTRAINT "SiteSettings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SiteSettings" ("defaultSenderEmail", "defaultSenderEmailPassword", "heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id", "referralBonusSpins") SELECT "defaultSenderEmail", "defaultSenderEmailPassword", "heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id", "referralBonusSpins" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
CREATE UNIQUE INDEX "SiteSettings_partnerId_key" ON "SiteSettings"("partnerId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "passwordHash" TEXT,
    "normalizedEmail" TEXT,
    "partnerId" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "normalizedEmail", "passwordHash", "phone", "referralCode", "referredById", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "normalizedEmail", "passwordHash", "phone", "referralCode", "referredById", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivityLog_partnerId_idx" ON "ActivityLog"("partnerId");
```

Si vous utilisez l'option B, marquez ensuite la migration comme appliquée pour que `prisma migrate deploy` ne tente pas de la rejouer plus tard :

```bash
TURSO_DATABASE_URL="<url prod>" TURSO_AUTH_TOKEN="<token prod>" DATABASE_URL="<url prod libsql>" npx prisma migrate resolve --applied 20260714164227_partner_spaces
```

## Étape 3 — Backfill de `User.partnerId`

Les comptes `PARTNER` existants (s'il y en a) n'ont pas encore de `partnerId` après la migration ci-dessus — ce champ est optionnel exprès pour ne rien casser à l'étape SQL. Exécutez ce script une seule fois, connecté à la production, pour leur assigner le bon partenaire en réutilisant l'heuristique déjà en place aujourd'hui dans `loginAdmin` (domaine email vs `Partner.name` / `Partner.allowedDomains`) :

```js
// backfill-user-partnerid.mjs — à exécuter une seule fois contre la prod, puis supprimer
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

const partnerUsers = await prisma.user.findMany({ where: { role: 'PARTNER', partnerId: null } })
console.log(`${partnerUsers.length} compte(s) PARTNER sans partnerId à traiter.`)

let matched = 0, unmatched = 0
for (const user of partnerUsers) {
  const domainPart = user.email.split('@')[1] || ''
  const domainPrefix = domainPart.split('.')[0]?.toLowerCase() || ''
  const partner = await prisma.partner.findFirst({
    where: { OR: [{ name: { contains: domainPrefix } }, { allowedDomains: { contains: domainPart } }] },
  })
  if (partner) {
    await prisma.user.update({ where: { id: user.id }, data: { partnerId: partner.id } })
    console.log(`OK   ${user.email} -> ${partner.name} (${partner.id})`)
    matched++
  } else {
    console.warn(`SKIP ${user.email} : aucun partenaire correspondant trouvé (à traiter manuellement).`)
    unmatched++
  }
}
console.log(`Terminé : ${matched} rattaché(s), ${unmatched} sans correspondance.`)
await prisma.$disconnect()
```

Lancez-le avec `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` de production dans l'environnement, puis **supprimez le fichier immédiatement après usage** — mêmes règles que pour tout script touchant la prod. Si des comptes sortent en `SKIP`, il faudra leur assigner `partnerId` manuellement (une seule `UPDATE` par compte, en connaissant le bon `Partner.id`).

Ce script a été testé en local (`dev.db`) : 0 compte PARTNER n'y existant actuellement, il s'est terminé sans rien modifier — comportement attendu, pas une erreur.

## Étape 4 — Vérification post-migration

```sql
SELECT id, name, slug, isActive FROM Partner;
SELECT COUNT(*) FROM User WHERE role = 'PARTNER' AND partnerId IS NULL;  -- doit être 0 (ou justifié)
PRAGMA table_info(SiteSettings);  -- doit inclure "partnerId"
```

Puis testez une vraie connexion avec un compte PARTNER existant pour confirmer que le login fonctionne toujours (il continue, pour l'instant, à utiliser la même heuristique au moment du login — Phase 2 le fera lire directement `User.partnerId`).

## Ce que cette migration ne fait PAS

- Elle ne modifie aucune donnée de campagne, lot, gagnant, lead, token.
- Elle ne touche pas à la vidéo hero (`SiteSettings.heroVideoData`/`heroVideoMimeType`) — ces colonnes sont recopiées telles quelles dans la ligne globale `id: "main"`.
- Elle ne change aucune procédure tRPC ni logique d'autorisation (ça, c'est déjà fait séparément et sans dépendance schéma — voir commit "Ajoute la vérification d'appartenance partenaire sur 8 procédures roulette/tirage" — et ce qui reste sera fait en Phase 2).
