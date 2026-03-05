-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceProvider" TEXT NOT NULL DEFAULT 'spotify',
    "sourcePlaylistId" TEXT NOT NULL,
    "sourcePlaylistName" TEXT,
    "targetProvider" TEXT NOT NULL DEFAULT 'google',
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "processedTracks" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TransferJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "youtubeMusicId" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferJobId" TEXT NOT NULL,
    CONSTRAINT "TransferItem_transferJobId_fkey" FOREIGN KEY ("transferJobId") REFERENCES "TransferJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key" ON "OAuthAccount"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "TransferJob_userId_idx" ON "TransferJob"("userId");

-- CreateIndex
CREATE INDEX "TransferJob_status_idx" ON "TransferJob"("status");

-- CreateIndex
CREATE INDEX "TransferJob_userId_status_idx" ON "TransferJob"("userId", "status");

-- CreateIndex
CREATE INDEX "TransferItem_transferJobId_idx" ON "TransferItem"("transferJobId");
