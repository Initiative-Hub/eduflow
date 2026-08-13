-- CreateEnum
CREATE TYPE "game_quiz_template_key" AS ENUM ('live_quiz_rally');

-- CreateEnum
CREATE TYPE "game_quiz_status" AS ENUM ('draft', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "game_session_phase" AS ENUM ('lobby', 'question_open', 'reveal', 'scoreboard', 'final_celebration');

-- CreateEnum
CREATE TYPE "game_session_context_audience" AS ENUM ('host', 'participant');

-- CreateEnum
CREATE TYPE "game_session_close_reason" AS ENUM ('host_left', 'viewed_report');

-- CreateTable
CREATE TABLE "game_quiz" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "template_key" "game_quiz_template_key" NOT NULL DEFAULT 'live_quiz_rally',
    "status" "game_quiz_status" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "randomize_question_order" BOOLEAN NOT NULL DEFAULT false,
    "randomize_answer_order" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "game_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_quiz_question" (
    "id" TEXT NOT NULL,
    "game_quiz_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "hint" TEXT,
    "explanation" TEXT,
    "timer_seconds" INTEGER NOT NULL,
    "max_points" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_quiz_option" (
    "id" TEXT NOT NULL,
    "game_quiz_question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_quiz_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session" (
    "id" TEXT NOT NULL,
    "game_quiz_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "template_key" "game_quiz_template_key" NOT NULL,
    "game_quiz_revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "difficulty" TEXT,
    "randomize_question_order" BOOLEAN NOT NULL,
    "randomize_answer_order" BOOLEAN NOT NULL,
    "join_code" TEXT NOT NULL,
    "realtime_key" TEXT NOT NULL,
    "joining_locked" BOOLEAN NOT NULL DEFAULT false,
    "phase" "game_session_phase" NOT NULL DEFAULT 'lobby',
    "current_round_index" INTEGER,
    "state_version" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "last_host_seen_at" TIMESTAMP(3),
    "closed_reason" "game_session_close_reason",
    "join_code_released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_session_context" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audience" "game_session_context_audience" NOT NULL,
    "participant_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_session_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_round" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "source_question_id" TEXT,
    "prompt" TEXT NOT NULL,
    "hint" TEXT,
    "explanation" TEXT,
    "timer_seconds" INTEGER NOT NULL,
    "max_points" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "revealed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_round_option" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "source_option_id" TEXT,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_round_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participant" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "realtime_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "game_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_answer" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_time_ms" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_quiz_owner_id_status_updated_at_idx" ON "game_quiz"("owner_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "game_quiz_archived_at_idx" ON "game_quiz"("archived_at");

-- CreateIndex
CREATE INDEX "game_quiz_question_game_quiz_id_idx" ON "game_quiz_question"("game_quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_quiz_question_game_quiz_id_order_index_key" ON "game_quiz_question"("game_quiz_id", "order_index");

-- CreateIndex
CREATE INDEX "game_quiz_option_game_quiz_question_id_idx" ON "game_quiz_option"("game_quiz_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_quiz_option_game_quiz_question_id_order_index_key" ON "game_quiz_option"("game_quiz_question_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "game_session_realtime_key_key" ON "game_session"("realtime_key");

-- CreateIndex
CREATE INDEX "game_session_game_quiz_id_created_at_idx" ON "game_session"("game_quiz_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "game_session_host_id_created_at_idx" ON "game_session"("host_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "game_session_phase_created_at_idx" ON "game_session"("phase", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "game_session_context_token_hash_key" ON "game_session_context"("token_hash");

-- CreateIndex
CREATE INDEX "game_session_context_session_id_audience_expires_at_idx" ON "game_session_context"("session_id", "audience", "expires_at");

-- CreateIndex
CREATE INDEX "game_session_context_user_id_audience_expires_at_idx" ON "game_session_context"("user_id", "audience", "expires_at");

-- CreateIndex
CREATE INDEX "game_session_context_participant_id_idx" ON "game_session_context"("participant_id");

-- CreateIndex
CREATE INDEX "game_round_session_id_idx" ON "game_round"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_round_session_id_order_index_key" ON "game_round"("session_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "game_round_id_session_id_key" ON "game_round"("id", "session_id");

-- CreateIndex
CREATE INDEX "game_round_option_round_id_idx" ON "game_round_option"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_round_option_round_id_order_index_key" ON "game_round_option"("round_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "game_round_option_id_round_id_key" ON "game_round_option"("id", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_participant_realtime_key_key" ON "game_participant"("realtime_key");

-- CreateIndex
CREATE INDEX "game_participant_user_id_joined_at_idx" ON "game_participant"("user_id", "joined_at" DESC);

-- CreateIndex
CREATE INDEX "game_participant_session_id_score_idx" ON "game_participant"("session_id", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "game_participant_session_id_user_id_key" ON "game_participant"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_participant_id_session_id_key" ON "game_participant"("id", "session_id");

-- CreateIndex
CREATE INDEX "game_answer_session_id_round_id_idx" ON "game_answer"("session_id", "round_id");

-- CreateIndex
CREATE INDEX "game_answer_round_id_idx" ON "game_answer"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_answer_participant_id_round_id_key" ON "game_answer"("participant_id", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_answer_participant_id_idempotency_key_key" ON "game_answer"("participant_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "game_quiz" ADD CONSTRAINT "game_quiz_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_quiz_question" ADD CONSTRAINT "game_quiz_question_game_quiz_id_fkey" FOREIGN KEY ("game_quiz_id") REFERENCES "game_quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_quiz_option" ADD CONSTRAINT "game_quiz_option_game_quiz_question_id_fkey" FOREIGN KEY ("game_quiz_question_id") REFERENCES "game_quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_quiz_id_fkey" FOREIGN KEY ("game_quiz_id") REFERENCES "game_quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_context" ADD CONSTRAINT "game_session_context_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_context" ADD CONSTRAINT "game_session_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_session_context" ADD CONSTRAINT "game_session_context_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_round" ADD CONSTRAINT "game_round_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_round_option" ADD CONSTRAINT "game_round_option_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "game_round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_participant_id_session_id_fkey" FOREIGN KEY ("participant_id", "session_id") REFERENCES "game_participant"("id", "session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_round_id_session_id_fkey" FOREIGN KEY ("round_id", "session_id") REFERENCES "game_round"("id", "session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_selected_option_id_round_id_fkey" FOREIGN KEY ("selected_option_id", "round_id") REFERENCES "game_round_option"("id", "round_id") ON DELETE RESTRICT ON UPDATE CASCADE;
