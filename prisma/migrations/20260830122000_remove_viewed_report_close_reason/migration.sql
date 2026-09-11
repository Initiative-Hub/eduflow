UPDATE "game_session"
SET "closed_reason" = 'completed'
WHERE "closed_reason" = 'viewed_report';

CREATE TYPE "game_session_close_reason_new" AS ENUM (
  'host_left',
  'completed',
  'host_ended'
);

ALTER TABLE "game_session"
ALTER COLUMN "closed_reason" TYPE "game_session_close_reason_new"
USING ("closed_reason"::text::"game_session_close_reason_new");

ALTER TYPE "game_session_close_reason" RENAME TO "game_session_close_reason_old";
ALTER TYPE "game_session_close_reason_new" RENAME TO "game_session_close_reason";
DROP TYPE "game_session_close_reason_old";
