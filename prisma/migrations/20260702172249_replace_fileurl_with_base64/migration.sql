/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `ReceiptSubmission` table. All the data in the column will be lost.
  - Added the required column `fileData` to the `ReceiptSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileMimeType` to the `ReceiptSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReceiptSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fileData" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedByEmail" TEXT,
    CONSTRAINT "ReceiptSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReceiptSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReceiptSubmission" ("campaignId", "id", "reviewedAt", "reviewedByEmail", "status", "submittedAt", "userId") SELECT "campaignId", "id", "reviewedAt", "reviewedByEmail", "status", "submittedAt", "userId" FROM "ReceiptSubmission";
DROP TABLE "ReceiptSubmission";
ALTER TABLE "new_ReceiptSubmission" RENAME TO "ReceiptSubmission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
