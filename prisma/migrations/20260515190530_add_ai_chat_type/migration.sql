-- CreateEnum
CREATE TYPE "AiChatType" AS ENUM ('CHAT_ASSISTANT', 'SOCRATIC_TUTOR', 'ENGLISH_ASSISTANT', 'WRITING_ASSISTANT', 'STUDY_ASSISTANT');

-- AlterTable
ALTER TABLE "ai_chats" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "type" "AiChatType" NOT NULL DEFAULT 'CHAT_ASSISTANT';

-- CreateIndex
CREATE INDEX "ai_chats_user_id_type_updated_at_idx" ON "ai_chats"("user_id", "type", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ai_chats_type_status_updated_at_idx" ON "ai_chats"("type", "status", "updated_at" DESC);
