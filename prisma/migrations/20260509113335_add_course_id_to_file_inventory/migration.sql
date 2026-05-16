-- AlterTable
ALTER TABLE "file_inventory" ADD COLUMN     "course_id" TEXT;

-- CreateIndex
CREATE INDEX "file_inventory_course_id_idx" ON "file_inventory"("course_id");

-- CreateIndex
CREATE INDEX "file_inventory_course_id_status_uploadedAt_idx" ON "file_inventory"("course_id", "status", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "file_inventory_course_id_deletedAt_idx" ON "file_inventory"("course_id", "deletedAt");

-- AddForeignKey
ALTER TABLE "file_inventory" ADD CONSTRAINT "file_inventory_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
