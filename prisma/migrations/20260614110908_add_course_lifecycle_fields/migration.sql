-- AlterTable
ALTER TABLE "course" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "course_deletedAt_idx" ON "course"("deletedAt");

-- CreateIndex
CREATE INDEX "course_archivedAt_idx" ON "course"("archivedAt");
