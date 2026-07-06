-- AlterTable
ALTER TABLE "Prize" ADD COLUMN "color" TEXT;
ALTER TABLE "Prize" ADD COLUMN "imageData" TEXT;
ALTER TABLE "Prize" ADD COLUMN "imageMimeType" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gameMode" TEXT NOT NULL DEFAULT 'ROULETTE',
    "imageData" TEXT,
    "imageMimeType" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeToken" TEXT NOT NULL,
    "templateUsed" TEXT,
    "spinsPerClient" INTEGER NOT NULL DEFAULT 1,
    "postSignupMessage" TEXT,
    "qrColor" TEXT DEFAULT '#F97316',
    "senderEmail" TEXT,
    "senderEmailPassword" TEXT,
    "adBadge1" TEXT,
    "adTitle1" TEXT,
    "adDesc1" TEXT,
    "adBadge2" TEXT,
    "adTitle2" TEXT,
    "adDesc2" TEXT,
    "adBadge3" TEXT,
    "adTitle3" TEXT,
    "adDesc3" TEXT,
    "promoTitle" TEXT,
    "promoCode" TEXT,
    "promoDesc" TEXT,
    "promoUrl" TEXT,
    CONSTRAINT "Campaign_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("adBadge1", "adBadge2", "adBadge3", "adDesc1", "adDesc2", "adDesc3", "adTitle1", "adTitle2", "adTitle3", "endDate", "gameMode", "id", "imageData", "imageMimeType", "isActive", "isDraft", "partnerId", "promoCode", "promoDesc", "promoTitle", "promoUrl", "qrCodeToken", "senderEmail", "senderEmailPassword", "startDate", "templateUsed", "title") SELECT "adBadge1", "adBadge2", "adBadge3", "adDesc1", "adDesc2", "adDesc3", "adTitle1", "adTitle2", "adTitle3", "endDate", "gameMode", "id", "imageData", "imageMimeType", "isActive", "isDraft", "partnerId", "promoCode", "promoDesc", "promoTitle", "promoUrl", "qrCodeToken", "senderEmail", "senderEmailPassword", "startDate", "templateUsed", "title" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_qrCodeToken_key" ON "Campaign"("qrCodeToken");
CREATE INDEX "Campaign_isActive_startDate_endDate_idx" ON "Campaign"("isActive", "startDate", "endDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
