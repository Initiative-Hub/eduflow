/*
  Warnings:

  - You are about to drop the column `cloudStorage` on the `file_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `file_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `file_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `file_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded_at` on the `file_inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `file_inventory` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `file_inventory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileInventoryStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED', 'DELETED');

-- DropForeignKey
ALTER TABLE "file_inventory" DROP CONSTRAINT "file_inventory_userId_fkey";

-- DropIndex
DROP INDEX "file_inventory_userId_idx";

-- AlterTable
ALTER TABLE "file_inventory" DROP COLUMN "cloudStorage",
DROP COLUMN "fileName",
DROP COLUMN "fileSize",
DROP COLUMN "mimeType",
DROP COLUMN "uploaded_at",
DROP COLUMN "userId",
ADD COLUMN     "bucket" TEXT,
ADD COLUMN     "checksum_sha256" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "extension" TEXT,
ADD COLUMN     "file_size" BIGINT,
ADD COLUMN     "is_folder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "object_key" TEXT,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "status" "FileInventoryStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "file_inventory_user_id_idx" ON "file_inventory"("user_id");

-- CreateIndex
CREATE INDEX "file_inventory_parent_id_idx" ON "file_inventory"("parent_id");

-- CreateIndex
CREATE INDEX "file_inventory_user_id_status_uploadedAt_idx" ON "file_inventory"("user_id", "status", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "file_inventory_user_id_deletedAt_idx" ON "file_inventory"("user_id", "deletedAt");

-- CreateIndex
CREATE INDEX "file_inventory_user_id_object_key_idx" ON "file_inventory"("user_id", "object_key");

-- AddForeignKey
ALTER TABLE "file_inventory" ADD CONSTRAINT "file_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_inventory" ADD CONSTRAINT "file_inventory_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "file_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
