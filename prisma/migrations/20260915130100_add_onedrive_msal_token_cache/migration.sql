ALTER TABLE "connected_integration" ADD COLUMN "token_cache" TEXT;
ALTER TABLE "connected_integration" ALTER COLUMN "refresh_token" DROP NOT NULL;
