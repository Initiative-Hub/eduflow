/*
  Warnings:

  - You are about to drop the column `lesson_id` on the `quiz` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "quiz" DROP CONSTRAINT "quiz_lesson_id_fkey";

-- DropIndex
DROP INDEX "quiz_lesson_id_idx";

-- AlterTable
ALTER TABLE "quiz" DROP COLUMN "lesson_id";

-- CreateTable
CREATE TABLE "_LessonToQuiz" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LessonToQuiz_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LessonToQuiz_B_index" ON "_LessonToQuiz"("B");

-- AddForeignKey
ALTER TABLE "_LessonToQuiz" ADD CONSTRAINT "_LessonToQuiz_A_fkey" FOREIGN KEY ("A") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LessonToQuiz" ADD CONSTRAINT "_LessonToQuiz_B_fkey" FOREIGN KEY ("B") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
