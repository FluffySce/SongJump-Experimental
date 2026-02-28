/*
  Warnings:

  - The values [found,not_found] on the enum `TrackStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [pending,running,partial,completed,failed] on the enum `TransferStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `retryCount` on the `TransferJob` table. All the data in the column will be lost.
  - You are about to drop the column `spotifyPlaylistId` on the `TransferJob` table. All the data in the column will be lost.
  - You are about to drop the column `spotifyPlaylistName` on the `TransferJob` table. All the data in the column will be lost.
  - Added the required column `sourcePlaylistId` to the `TransferJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TransferJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TrackStatus_new" AS ENUM ('PENDING', 'FOUND', 'NOT_FOUND', 'FAILED');
ALTER TABLE "public"."TransferItem" ALTER COLUMN "status" TYPE "public"."TrackStatus_new" USING ("status"::text::"public"."TrackStatus_new");
ALTER TYPE "public"."TrackStatus" RENAME TO "TrackStatus_old";
ALTER TYPE "public"."TrackStatus_new" RENAME TO "TrackStatus";
DROP TYPE "public"."TrackStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."TransferStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');
ALTER TABLE "public"."TransferJob" ALTER COLUMN "status" TYPE "public"."TransferStatus_new" USING ("status"::text::"public"."TransferStatus_new");
ALTER TYPE "public"."TransferStatus" RENAME TO "TransferStatus_old";
ALTER TYPE "public"."TransferStatus_new" RENAME TO "TransferStatus";
DROP TYPE "public"."TransferStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."TransferItem" ADD COLUMN     "errorMessage" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."TransferJob" DROP COLUMN "retryCount",
DROP COLUMN "spotifyPlaylistId",
DROP COLUMN "spotifyPlaylistName",
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "failureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedTracks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourcePlaylistId" TEXT NOT NULL,
ADD COLUMN     "sourcePlaylistName" TEXT,
ADD COLUMN     "sourceProvider" "public"."Provider" NOT NULL DEFAULT 'spotify',
ADD COLUMN     "successCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetProvider" "public"."Provider" NOT NULL DEFAULT 'google',
ADD COLUMN     "totalTracks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
