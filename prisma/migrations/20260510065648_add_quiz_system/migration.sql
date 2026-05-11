-- CreateEnum
CREATE TYPE "QuizCategory" AS ENUM ('SELECTION_BASED', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "QuestionSubType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'ORDERING', 'ESSAY', 'FILL_IN_THE_BLANK', 'DRAG_AND_DROP');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW');

-- CreateEnum
CREATE TYPE "SelectionMethod" AS ENUM ('HAND_PICK', 'RANDOM', 'MANUAL_CREATE');

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "category" "QuizCategory" NOT NULL,
    "sub_type" "QuestionSubType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer_data" JSONB NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "QuizCategory" NOT NULL,
    "sub_type" "QuestionSubType" NOT NULL,
    "delivery_mode" "DeliveryMode" NOT NULL,
    "selection_method" "SelectionMethod" NOT NULL,
    "question_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_course_id_idx" ON "question"("course_id");

-- CreateIndex
CREATE INDEX "question_course_id_category_sub_type_idx" ON "question"("course_id", "category", "sub_type");

-- CreateIndex
CREATE INDEX "question_lesson_id_idx" ON "question"("lesson_id");

-- CreateIndex
CREATE INDEX "quiz_course_id_idx" ON "quiz"("course_id");

-- CreateIndex
CREATE INDEX "quiz_lesson_id_idx" ON "quiz"("lesson_id");

-- CreateIndex
CREATE INDEX "quiz_question_quiz_id_idx" ON "quiz_question"("quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_quiz_id_question_id_key" ON "quiz_question"("quiz_id", "question_id");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
