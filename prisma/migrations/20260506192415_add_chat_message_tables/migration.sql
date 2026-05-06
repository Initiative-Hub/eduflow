-- CreateEnum
CREATE TYPE "AiChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "AiChatStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateTable
CREATE TABLE "ai_chats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_id" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "status" "AiChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" "AiChatRole" NOT NULL,
    "parts" JSONB DEFAULT '[]',
    "provider" TEXT,
    "model" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_chats_user_id_updated_at_idx" ON "ai_chats"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ai_chats_guest_id_updated_at_idx" ON "ai_chats"("guest_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ai_chats_status_updated_at_idx" ON "ai_chats"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ai_chat_messages_chat_id_created_at_idx" ON "ai_chat_messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_chat_messages_user_id_created_at_idx" ON "ai_chat_messages"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_chat_messages_role_idx" ON "ai_chat_messages"("role");

-- AddForeignKey
ALTER TABLE "ai_chats" ADD CONSTRAINT "ai_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
