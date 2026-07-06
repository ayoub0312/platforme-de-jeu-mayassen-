-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "heroVideoData" TEXT,
    "heroVideoMimeType" TEXT,
    "heroPosterData" TEXT,
    "heroPosterMimeType" TEXT,
    "referralBonusSpins" INTEGER NOT NULL DEFAULT 2,
    "defaultSenderEmail" TEXT,
    "defaultSenderEmailPassword" TEXT
);
INSERT INTO "new_SiteSettings" ("heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id") SELECT "heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
