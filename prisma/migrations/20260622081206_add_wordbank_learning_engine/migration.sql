-- CreateEnum
CREATE TYPE "WordbankReviewStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "saved_vocabulary"
ADD COLUMN "mastery_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "vocabulary_list" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_vocabulary_list_item" (
    "saved_vocabulary_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_vocabulary_list_item_pkey" PRIMARY KEY ("saved_vocabulary_id","list_id")
);

-- CreateTable
CREATE TABLE "wordbank_review_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "WordbankReviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "quiz" JSONB NOT NULL,
    "client_quiz" JSONB NOT NULL,
    "word_map" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "wordbank_review_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordbank_review_attempt" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wordbank_review_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vocabulary_list_user_id_created_at_idx" ON "vocabulary_list"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_list_user_id_name_key" ON "vocabulary_list"("user_id", "name");

-- CreateIndex
CREATE INDEX "saved_vocabulary_list_item_list_id_idx" ON "saved_vocabulary_list_item"("list_id");

-- CreateIndex
CREATE INDEX "wordbank_review_session_user_id_created_at_idx" ON "wordbank_review_session"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wordbank_review_attempt_session_id_idx" ON "wordbank_review_attempt"("session_id");

-- CreateIndex
CREATE INDEX "wordbank_review_attempt_user_id_created_at_idx" ON "wordbank_review_attempt"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "saved_vocabulary_user_id_mastery_level_next_review_at_idx" ON "saved_vocabulary"("user_id", "mastery_level", "next_review_at");

-- AddForeignKey
ALTER TABLE "vocabulary_list" ADD CONSTRAINT "vocabulary_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vocabulary_list_item" ADD CONSTRAINT "saved_vocabulary_list_item_saved_vocabulary_id_fkey" FOREIGN KEY ("saved_vocabulary_id") REFERENCES "saved_vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vocabulary_list_item" ADD CONSTRAINT "saved_vocabulary_list_item_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "vocabulary_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordbank_review_session" ADD CONSTRAINT "wordbank_review_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordbank_review_attempt" ADD CONSTRAINT "wordbank_review_attempt_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "wordbank_review_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordbank_review_attempt" ADD CONSTRAINT "wordbank_review_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
