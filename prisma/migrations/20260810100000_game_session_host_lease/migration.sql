CREATE TYPE "game_session_close_reason" AS ENUM ('host_left', 'viewed_report');

ALTER TABLE "game_session"
  ADD COLUMN "last_host_seen_at" TIMESTAMP(3),
  ADD COLUMN "closed_reason" "game_session_close_reason";

UPDATE "game_session"
SET "last_host_seen_at" = "updated_at"
WHERE "phase" <> 'report';
