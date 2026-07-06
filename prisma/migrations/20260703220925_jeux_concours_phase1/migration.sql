/*
  Warnings:

  - The required column `qrCodeToken` was added to the `Campaign` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "QrScanEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
INSERT INTO "new_Campaign" ("adBadge1", "adBadge2", "adBadge3", "adDesc1", "adDesc2", "adDesc3", "adTitle1", "adTitle2", "adTitle3", "endDate", "gameMode", "id", "imageData", "imageMimeType", "isActive", "partnerId", "promoCode", "promoDesc", "promoTitle", "promoUrl", "senderEmail", "senderEmailPassword", "startDate", "title", "qrCodeToken") SELECT "adBadge1", "adBadge2", "adBadge3", "adDesc1", "adDesc2", "adDesc3", "adTitle1", "adTitle2", "adTitle3", "endDate", "gameMode", "id", "imageData", "imageMimeType", "isActive", "partnerId", "promoCode", "promoDesc", "promoTitle", "promoUrl", "senderEmail", "senderEmailPassword", "startDate", "title", lower(hex(randomblob(16))) FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_qrCodeToken_key" ON "Campaign"("qrCodeToken");
CREATE INDEX "Campaign_isActive_startDate_endDate_idx" ON "Campaign"("isActive", "startDate", "endDate");
CREATE TABLE "new_Prize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL,
    "remainingStock" INTEGER NOT NULL,
    "winProbability" REAL NOT NULL,
    "fallbackPrizeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "drawDate" DATETIME,
    "validityDays" INTEGER DEFAULT 30,
    CONSTRAINT "Prize_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prize" ("campaignId", "drawDate", "fallbackPrizeId", "id", "name", "remainingStock", "totalStock", "type", "validityDays", "winProbability") SELECT "campaignId", "drawDate", "fallbackPrizeId", "id", "name", "remainingStock", "totalStock", "type", "validityDays", "winProbability" FROM "Prize";
DROP TABLE "Prize";
ALTER TABLE "new_Prize" RENAME TO "Prize";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QrScanEvent_campaignId_scannedAt_idx" ON "QrScanEvent"("campaignId", "scannedAt");

-- CreateIndex
CREATE INDEX "OtpCode_phone_campaignId_idx" ON "OtpCode"("phone", "campaignId");

-- CreateIndex
CREATE INDEX "ActivityLog_targetType_targetId_idx" ON "ActivityLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
