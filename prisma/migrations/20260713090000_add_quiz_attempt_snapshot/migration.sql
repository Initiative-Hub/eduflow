-- AlterTable
ALTER TABLE "quiz_attempt" ADD COLUMN     "answered_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quiz_snapshot" JSONB;
