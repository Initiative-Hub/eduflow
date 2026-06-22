-- AlterTable
ALTER TABLE "lesson" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "module" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "lesson_module_id_deleted_at_idx" ON "lesson"("module_id", "deleted_at");

-- CreateIndex
CREATE INDEX "module_course_id_deleted_at_idx" ON "module"("course_id", "deleted_at");
