-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromoBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageData" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "linkUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PromoBanner" ("createdAt", "id", "imageData", "imageMimeType", "isActive", "linkUrl", "order") SELECT "createdAt", "id", "imageData", "imageMimeType", "isActive", "linkUrl", "order" FROM "PromoBanner";
DROP TABLE "PromoBanner";
ALTER TABLE "new_PromoBanner" RENAME TO "PromoBanner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
