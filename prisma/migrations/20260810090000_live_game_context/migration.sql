CREATE TYPE "game_session_context_audience" AS ENUM ('host', 'participant');

ALTER TABLE "game_session" ADD COLUMN "realtime_key" TEXT;
UPDATE "game_session"
SET "realtime_key" = replace(gen_random_uuid()::text, '-', '')
WHERE "realtime_key" IS NULL;
ALTER TABLE "game_session" ALTER COLUMN "realtime_key" SET NOT NULL;
CREATE UNIQUE INDEX "game_session_realtime_key_key" ON "game_session"("realtime_key");

ALTER TABLE "game_participant" ADD COLUMN "realtime_key" TEXT;
UPDATE "game_participant"
SET "realtime_key" = replace(gen_random_uuid()::text, '-', '')
WHERE "realtime_key" IS NULL;
ALTER TABLE "game_participant" ALTER COLUMN "realtime_key" SET NOT NULL;
CREATE UNIQUE INDEX "game_participant_realtime_key_key" ON "game_participant"("realtime_key");

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

CREATE UNIQUE INDEX "game_session_context_token_hash_key" ON "game_session_context"("token_hash");
CREATE INDEX "game_session_context_session_id_audience_expires_at_idx" ON "game_session_context"("session_id", "audience", "expires_at");
CREATE INDEX "game_session_context_user_id_audience_expires_at_idx" ON "game_session_context"("user_id", "audience", "expires_at");
CREATE INDEX "game_session_context_participant_id_idx" ON "game_session_context"("participant_id");

ALTER TABLE "game_session_context"
  ADD CONSTRAINT "game_session_context_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_session_context"
  ADD CONSTRAINT "game_session_context_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_session_context"
  ADD CONSTRAINT "game_session_context_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "game_participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
