-- CreateEnum
CREATE TYPE "game_quiz_template_key" AS ENUM ('live_quiz_rally');

-- CreateEnum
CREATE TYPE "game_quiz_status" AS ENUM ('draft', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "game_session_phase" AS ENUM (
    'lobby',
    'question_open',
    'answer_locked',
    'reveal',
    'progress',
    'final_celebration',
    'report'
);

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
    "show_leaderboard" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "game_quiz_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_quiz_revision_check" CHECK ("revision" >= 1)
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

    CONSTRAINT "game_quiz_question_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_quiz_question_timer_seconds_check" CHECK ("timer_seconds" BETWEEN 5 AND 300),
    CONSTRAINT "game_quiz_question_max_points_check" CHECK ("max_points" > 0),
    CONSTRAINT "game_quiz_question_order_index_check" CHECK ("order_index" >= 0)
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

    CONSTRAINT "game_quiz_option_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_quiz_option_order_index_check" CHECK ("order_index" >= 0)
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
    "show_leaderboard" BOOLEAN NOT NULL,
    "join_code" TEXT NOT NULL,
    "joining_locked" BOOLEAN NOT NULL DEFAULT false,
    "phase" "game_session_phase" NOT NULL DEFAULT 'lobby',
    "current_round_index" INTEGER,
    "state_version" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "join_code_released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_session_game_quiz_revision_check" CHECK ("game_quiz_revision" >= 1),
    CONSTRAINT "game_session_join_code_check" CHECK ("join_code" ~ '^[0-9]{6}$'),
    CONSTRAINT "game_session_current_round_index_check" CHECK ("current_round_index" IS NULL OR "current_round_index" >= 0),
    CONSTRAINT "game_session_state_version_check" CHECK ("state_version" >= 1)
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

    CONSTRAINT "game_round_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_round_timer_seconds_check" CHECK ("timer_seconds" BETWEEN 5 AND 300),
    CONSTRAINT "game_round_max_points_check" CHECK ("max_points" > 0),
    CONSTRAINT "game_round_order_index_check" CHECK ("order_index" >= 0),
    CONSTRAINT "game_round_timing_check" CHECK (
        ("opened_at" IS NULL AND "deadline_at" IS NULL)
        OR ("opened_at" IS NOT NULL AND "deadline_at" IS NOT NULL AND "deadline_at" >= "opened_at")
    )
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

    CONSTRAINT "game_round_option_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_round_option_order_index_check" CHECK ("order_index" >= 0)
);

-- CreateTable
CREATE TABLE "game_participant" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "game_participant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_participant_score_check" CHECK ("score" >= 0),
    CONSTRAINT "game_participant_display_name_check" CHECK (length(trim("display_name")) > 0)
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

    CONSTRAINT "game_answer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "game_answer_response_time_ms_check" CHECK ("response_time_ms" >= 0),
    CONSTRAINT "game_answer_points_awarded_check" CHECK ("points_awarded" >= 0)
);

-- CreateIndex
CREATE INDEX "game_quiz_owner_id_status_updated_at_idx" ON "game_quiz"("owner_id", "status", "updated_at" DESC);
CREATE INDEX "game_quiz_archived_at_idx" ON "game_quiz"("archived_at");
CREATE UNIQUE INDEX "game_quiz_question_game_quiz_id_order_index_key" ON "game_quiz_question"("game_quiz_id", "order_index");
CREATE INDEX "game_quiz_question_game_quiz_id_idx" ON "game_quiz_question"("game_quiz_id");
CREATE UNIQUE INDEX "game_quiz_option_game_quiz_question_id_order_index_key" ON "game_quiz_option"("game_quiz_question_id", "order_index");
CREATE INDEX "game_quiz_option_game_quiz_question_id_idx" ON "game_quiz_option"("game_quiz_question_id");
CREATE INDEX "game_session_game_quiz_id_created_at_idx" ON "game_session"("game_quiz_id", "created_at" DESC);
CREATE INDEX "game_session_host_id_created_at_idx" ON "game_session"("host_id", "created_at" DESC);
CREATE INDEX "game_session_phase_created_at_idx" ON "game_session"("phase", "created_at" DESC);
CREATE UNIQUE INDEX "game_session_active_join_code_key" ON "game_session"("join_code") WHERE "join_code_released_at" IS NULL;
CREATE UNIQUE INDEX "game_round_session_id_order_index_key" ON "game_round"("session_id", "order_index");
CREATE UNIQUE INDEX "game_round_id_session_id_key" ON "game_round"("id", "session_id");
CREATE INDEX "game_round_session_id_idx" ON "game_round"("session_id");
CREATE UNIQUE INDEX "game_round_option_round_id_order_index_key" ON "game_round_option"("round_id", "order_index");
CREATE UNIQUE INDEX "game_round_option_id_round_id_key" ON "game_round_option"("id", "round_id");
CREATE INDEX "game_round_option_round_id_idx" ON "game_round_option"("round_id");
CREATE UNIQUE INDEX "game_participant_session_id_user_id_key" ON "game_participant"("session_id", "user_id");
CREATE UNIQUE INDEX "game_participant_id_session_id_key" ON "game_participant"("id", "session_id");
CREATE INDEX "game_participant_user_id_joined_at_idx" ON "game_participant"("user_id", "joined_at" DESC);
CREATE INDEX "game_participant_session_id_score_idx" ON "game_participant"("session_id", "score" DESC);
CREATE UNIQUE INDEX "game_answer_participant_id_round_id_key" ON "game_answer"("participant_id", "round_id");
CREATE UNIQUE INDEX "game_answer_participant_id_idempotency_key_key" ON "game_answer"("participant_id", "idempotency_key");
CREATE INDEX "game_answer_session_id_round_id_idx" ON "game_answer"("session_id", "round_id");
CREATE INDEX "game_answer_round_id_idx" ON "game_answer"("round_id");

-- Foreign keys preserve the immutable session snapshot and make every answer
-- belong to a participant, round, and selected option from the same session.
ALTER TABLE "game_quiz" ADD CONSTRAINT "game_quiz_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_quiz_question" ADD CONSTRAINT "game_quiz_question_game_quiz_id_fkey" FOREIGN KEY ("game_quiz_id") REFERENCES "game_quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_quiz_option" ADD CONSTRAINT "game_quiz_option_game_quiz_question_id_fkey" FOREIGN KEY ("game_quiz_question_id") REFERENCES "game_quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_quiz_id_fkey" FOREIGN KEY ("game_quiz_id") REFERENCES "game_quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_round" ADD CONSTRAINT "game_round_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_round_option" ADD CONSTRAINT "game_round_option_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "game_round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_participant" ADD CONSTRAINT "game_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_participant_id_session_id_fkey" FOREIGN KEY ("participant_id", "session_id") REFERENCES "game_participant"("id", "session_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_round_id_session_id_fkey" FOREIGN KEY ("round_id", "session_id") REFERENCES "game_round"("id", "session_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_answer" ADD CONSTRAINT "game_answer_selected_option_id_round_id_fkey" FOREIGN KEY ("selected_option_id", "round_id") REFERENCES "game_round_option"("id", "round_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL can validate the final option set at transaction commit. This
-- keeps authoring flexible inside a bulk transaction while enforcing 2–4
-- options and exactly one correct option for every persisted question/round.
CREATE FUNCTION "enforce_game_quiz_question_options"() RETURNS TRIGGER AS $$
DECLARE
    affected_question_id TEXT;
    option_count INTEGER;
    correct_option_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_question_id := OLD."game_quiz_question_id";
    ELSE
        affected_question_id := NEW."game_quiz_question_id";
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "game_quiz_question" WHERE "id" = affected_question_id) THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE "is_correct")
    INTO option_count, correct_option_count
    FROM "game_quiz_option"
    WHERE "game_quiz_question_id" = affected_question_id;

    IF option_count < 2 OR option_count > 4 OR correct_option_count <> 1 THEN
        RAISE EXCEPTION 'game quiz question % must have 2-4 options and exactly one correct option', affected_question_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "game_quiz_option_insert_check"
AFTER INSERT ON "game_quiz_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_quiz_question_options"();

CREATE CONSTRAINT TRIGGER "game_quiz_option_update_check"
AFTER UPDATE OF "game_quiz_question_id", "is_correct" ON "game_quiz_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_quiz_question_options"();

CREATE CONSTRAINT TRIGGER "game_quiz_option_delete_check"
AFTER DELETE ON "game_quiz_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_quiz_question_options"();

CREATE FUNCTION "enforce_game_round_options"() RETURNS TRIGGER AS $$
DECLARE
    affected_round_id TEXT;
    option_count INTEGER;
    correct_option_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_round_id := OLD."round_id";
    ELSE
        affected_round_id := NEW."round_id";
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "game_round" WHERE "id" = affected_round_id) THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE "is_correct")
    INTO option_count, correct_option_count
    FROM "game_round_option"
    WHERE "round_id" = affected_round_id;

    IF option_count < 2 OR option_count > 4 OR correct_option_count <> 1 THEN
        RAISE EXCEPTION 'game round % must have 2-4 options and exactly one correct option', affected_round_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "game_round_option_insert_check"
AFTER INSERT ON "game_round_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_round_options"();

CREATE CONSTRAINT TRIGGER "game_round_option_update_check"
AFTER UPDATE OF "round_id", "is_correct" ON "game_round_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_round_options"();

CREATE CONSTRAINT TRIGGER "game_round_option_delete_check"
AFTER DELETE ON "game_round_option"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_game_round_options"();
