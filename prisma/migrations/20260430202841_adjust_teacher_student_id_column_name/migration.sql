-- DropForeignKey
ALTER TABLE "course" DROP CONSTRAINT "course_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "enrollment" DROP CONSTRAINT "enrollment_studentId_fkey";

-- DropIndex
DROP INDEX "enrollment_studentId_idx";

-- AlterTable
ALTER TABLE "course" RENAME COLUMN "teacherId" TO "ownerId";

-- AlterTable
ALTER TABLE "enrollment" RENAME COLUMN "studentId" TO "memberId";

-- CreateIndex
CREATE INDEX "enrollment_memberId_idx" ON "enrollment"("memberId");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
