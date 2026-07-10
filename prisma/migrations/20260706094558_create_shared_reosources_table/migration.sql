-- CreateEnum
CREATE TYPE "ShareResourceType" AS ENUM ('STUDY_INTERACTIVE_CONTENT', 'STUDY_CHAT');

-- CreateTable
CREATE TABLE "shared_resource" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "resource_type" "ShareResourceType" NOT NULL,
    "source_chat_id" TEXT,
    "source_message_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_resource_owner_user_id_created_at_idx" ON "shared_resource"("owner_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shared_resource_resource_type_created_at_idx" ON "shared_resource"("resource_type", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "shared_resource" ADD CONSTRAINT "shared_resource_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
