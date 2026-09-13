-- CreateEnum
CREATE TYPE "quiz_attempt_status" AS ENUM ('in_progress', 'completed');

-- AlterTable
ALTER TABLE "quiz_attempt" ADD COLUMN     "checked_question_indices" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "current_question_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "status" "quiz_attempt_status" NOT NULL DEFAULT 'in_progress',
ALTER COLUMN "answers" SET DEFAULT '{}',
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "max_score" DROP NOT NULL,
ALTER COLUMN "percentage" DROP NOT NULL,
ALTER COLUMN "results" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "quiz_attempt_user_id_status_idx" ON "quiz_attempt"("user_id", "status");

-- Existing rows are submitted results, not unfinished attempts.
UPDATE "quiz_attempt" SET "status" = 'completed',
  "completed_at" = "created_at";

CREATE UNIQUE INDEX "quiz_attempt_user_id_quiz_id_active_key"
  ON "quiz_attempt" ("user_id", "quiz_id") WHERE "status" = 'in_progress';

ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_completed_result_check"
  CHECK ("status" <> 'completed' OR (
    "completed_at" IS NOT NULL AND "score" IS NOT NULL AND "max_score" IS NOT NULL AND
    "percentage" IS NOT NULL AND "results" IS NOT NULL));
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_progress_check"
  CHECK ("current_question_index" >= 0 AND "revision" >= 0);
