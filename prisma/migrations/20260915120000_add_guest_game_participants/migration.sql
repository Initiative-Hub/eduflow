ALTER TABLE "game_participant"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "guest_id" TEXT;

CREATE UNIQUE INDEX "game_participant_session_id_guest_id_key"
  ON "game_participant"("session_id", "guest_id");

ALTER TABLE "game_participant"
  ADD CONSTRAINT "game_participant_exactly_one_identity_check"
  CHECK (("user_id" IS NOT NULL) <> ("guest_id" IS NOT NULL));
