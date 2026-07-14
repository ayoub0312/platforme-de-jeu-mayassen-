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
-- Backfill : slug généré depuis le nom existant (minuscules, espaces -> tirets).
-- Avec seulement 2 partenaires locaux aux noms distincts, aucune collision
-- possible ici. Voir MIGRATION_PROD.md pour la vérification d'unicité avant
-- d'appliquer l'équivalent en production.
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
