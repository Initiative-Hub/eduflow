-- Game sessions are now selected by their ID and authorized from the signed-in user.
DROP TABLE "game_session_context";

DROP TYPE "game_session_context_audience";
