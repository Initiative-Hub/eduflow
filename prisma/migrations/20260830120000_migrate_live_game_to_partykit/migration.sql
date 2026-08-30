ALTER TYPE "game_session_close_reason" ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE "game_session_close_reason" ADD VALUE IF NOT EXISTS 'host_ended';

CREATE TYPE "game_runtime_status" AS ENUM ('initializing', 'active', 'finalizing', 'finalized', 'aborted');

DROP INDEX IF EXISTS "game_session_realtime_key_key";
DROP INDEX IF EXISTS "game_participant_realtime_key_key";

ALTER TABLE "game_session"
  DROP COLUMN "realtime_key",
  DROP COLUMN "last_host_seen_at",
  ADD COLUMN "runtime_status" "game_runtime_status" NOT NULL DEFAULT 'initializing',
  ADD COLUMN "initialization_key" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "finalization_receipt" JSONB;

ALTER TABLE "game_participant"
  DROP COLUMN "realtime_key",
  DROP COLUMN "last_seen_at";

UPDATE "game_session"
SET
  "runtime_status" = CASE
    WHEN "ended_at" IS NOT NULL THEN 'finalized'::"game_runtime_status"
    ELSE 'aborted'::"game_runtime_status"
  END,
  "join_code_released_at" = COALESCE("join_code_released_at", "ended_at", CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "game_session_initialization_key_key" ON "game_session"("initialization_key");
CREATE UNIQUE INDEX "game_session_active_join_code_key"
  ON "game_session"("join_code")
  WHERE "join_code_released_at" IS NULL;
