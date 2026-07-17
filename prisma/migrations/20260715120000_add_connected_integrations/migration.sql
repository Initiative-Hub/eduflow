CREATE TYPE "integration_provider" AS ENUM ('google_drive');

CREATE TABLE "connected_integration" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "integration_provider" NOT NULL,
    "provider_account" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT NOT NULL,
    "scope" TEXT,
    "token_type" TEXT,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_integration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connected_integration_user_id_provider_key" ON "connected_integration"("user_id", "provider");
CREATE INDEX "connected_integration_provider_idx" ON "connected_integration"("provider");

ALTER TABLE "connected_integration"
ADD CONSTRAINT "connected_integration_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
