CREATE TYPE "game_session_close_reason" AS ENUM ('host_left', 'viewed_report');

ALTER TABLE "game_session"
  ADD COLUMN "last_host_seen_at" TIMESTAMP(3),
  ADD COLUMN "closed_reason" "game_session_close_reason";

UPDATE "game_session"
SET "last_host_seen_at" = "updated_at"
WHERE "phase" <> 'report';

CREATE INDEX "game_session_phase_last_host_seen_at_idx"
  ON "game_session"("phase", "last_host_seen_at");
