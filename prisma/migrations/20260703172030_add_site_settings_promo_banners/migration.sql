-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "heroVideoData" TEXT,
    "heroVideoMimeType" TEXT,
    "heroPosterData" TEXT,
    "heroPosterMimeType" TEXT
);

-- CreateTable
CREATE TABLE "PromoBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageData" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
