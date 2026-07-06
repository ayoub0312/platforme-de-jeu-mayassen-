-- AlterTable
ALTER TABLE "Prize" ADD COLUMN "validityDays" INTEGER DEFAULT 30;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
