-- Collapse the old manual lock/progress stages into the Kahoot-style flow.
CREATE TYPE "game_session_phase_new" AS ENUM (
    'lobby',
    'question_open',
    'reveal',
    'scoreboard',
    'final_celebration',
    'report'
);

ALTER TABLE "game_session" ALTER COLUMN "phase" DROP DEFAULT;

ALTER TABLE "game_session"
ALTER COLUMN "phase" TYPE "game_session_phase_new"
USING (
    CASE "phase"::text
        WHEN 'answer_locked' THEN 'reveal'
        WHEN 'progress' THEN 'scoreboard'
        ELSE "phase"::text
    END
)::"game_session_phase_new";

ALTER TABLE "game_session"
ALTER COLUMN "phase" SET DEFAULT 'lobby';

DROP TYPE "game_session_phase";
ALTER TYPE "game_session_phase_new" RENAME TO "game_session_phase";

ALTER TABLE "game_quiz" DROP COLUMN "show_leaderboard";
ALTER TABLE "game_session" DROP COLUMN "show_leaderboard";
