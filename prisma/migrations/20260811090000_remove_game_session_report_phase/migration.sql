ALTER TYPE "game_session_phase" RENAME TO "game_session_phase_old";

CREATE TYPE "game_session_phase" AS ENUM (
  'lobby',
  'question_open',
  'reveal',
  'scoreboard',
  'final_celebration'
);

ALTER TABLE "game_session"
  ALTER COLUMN "phase" DROP DEFAULT,
  ALTER COLUMN "phase" TYPE "game_session_phase"
    USING (
      CASE
        WHEN "phase"::text = 'report' THEN 'final_celebration'
        ELSE "phase"::text
      END
    )::"game_session_phase",
  ALTER COLUMN "phase" SET DEFAULT 'lobby';

DROP TYPE "game_session_phase_old";
