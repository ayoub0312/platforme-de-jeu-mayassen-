-- CreateTable
CREATE TABLE "LoyaltyPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderRef" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customerId" TEXT,
    "amountTnd" REAL NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "purchasedAt" DATETIME NOT NULL,
    "creditedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyPurchase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "purchaseId" TEXT,
    "voucherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- CreateTable
CREATE TABLE "LoyaltyVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "valueTnd" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "redeemedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyVoucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "partnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Customer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "email", "id", "name", "passwordHash", "phone", "updatedAt", "userId") SELECT "createdAt", "email", "id", "name", "passwordHash", "phone", "updatedAt", "userId" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");
CREATE INDEX "Customer_partnerId_idx" ON "Customer"("partnerId");
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
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pointsPerTnd" REAL NOT NULL DEFAULT 1,
    "redeemPointsPerTnd" INTEGER NOT NULL DEFAULT 100,
    "minRedeemPoints" INTEGER NOT NULL DEFAULT 500,
    "voucherValidityDays" INTEGER NOT NULL DEFAULT 90,
    CONSTRAINT "SiteSettings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SiteSettings" ("defaultSenderEmail", "defaultSenderEmailPassword", "heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id", "partnerId", "referralBonusSpins") SELECT "defaultSenderEmail", "defaultSenderEmailPassword", "heroPosterData", "heroPosterMimeType", "heroVideoData", "heroVideoMimeType", "id", "partnerId", "referralBonusSpins" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
CREATE UNIQUE INDEX "SiteSettings_partnerId_key" ON "SiteSettings"("partnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyPurchase_orderRef_key" ON "LoyaltyPurchase"("orderRef");
-- CreateIndex
CREATE INDEX "LoyaltyPurchase_email_idx" ON "LoyaltyPurchase"("email");
-- CreateIndex
CREATE INDEX "LoyaltyPurchase_customerId_idx" ON "LoyaltyPurchase"("customerId");
-- CreateIndex
CREATE INDEX "PointTransaction_customerId_createdAt_idx" ON "PointTransaction"("customerId", "createdAt");
-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyVoucher_code_key" ON "LoyaltyVoucher"("code");
-- CreateIndex
CREATE INDEX "LoyaltyVoucher_customerId_idx" ON "LoyaltyVoucher"("customerId");
