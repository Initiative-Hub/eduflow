-- AlterTable
ALTER TABLE "ai_chat" RENAME CONSTRAINT "ai_chats_pkey" TO "ai_chat_pkey";

-- AlterTable
ALTER TABLE "ai_chat_message" RENAME CONSTRAINT "ai_chat_messages_pkey" TO "ai_chat_message_pkey";

-- AlterTable
ALTER TABLE "course_permission" RENAME CONSTRAINT "course_permissions_pkey" TO "course_permission_pkey";

-- AlterTable
ALTER TABLE "lesson_quiz" RENAME CONSTRAINT "_LessonToQuiz_AB_pkey" TO "lesson_quiz_pkey";

-- AlterTable
ALTER TABLE "platform_permission" RENAME CONSTRAINT "platform_permissions_pkey" TO "platform_permission_pkey";

-- RenameForeignKey
ALTER TABLE "account" RENAME CONSTRAINT "account_userId_fkey" TO "account_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "ai_chat" RENAME CONSTRAINT "ai_chats_user_id_fkey" TO "ai_chat_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "ai_chat_message" RENAME CONSTRAINT "ai_chat_messages_chat_id_fkey" TO "ai_chat_message_chat_id_fkey";

-- RenameForeignKey
ALTER TABLE "ai_chat_message" RENAME CONSTRAINT "ai_chat_messages_user_id_fkey" TO "ai_chat_message_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "course" RENAME CONSTRAINT "course_ownerId_fkey" TO "course_owner_id_fkey";

-- RenameForeignKey
ALTER TABLE "course_permission" RENAME CONSTRAINT "course_permissions_course_id_fkey" TO "course_permission_course_id_fkey";

-- RenameForeignKey
ALTER TABLE "course_permission" RENAME CONSTRAINT "course_permissions_course_role_id_fkey" TO "course_permission_course_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "enrollment" RENAME CONSTRAINT "enrollment_courseId_fkey" TO "enrollment_course_id_fkey";

-- RenameForeignKey
ALTER TABLE "enrollment" RENAME CONSTRAINT "enrollment_memberId_fkey" TO "enrollment_member_id_fkey";

-- RenameForeignKey
ALTER TABLE "enrollment" RENAME CONSTRAINT "enrollment_roleId_fkey" TO "enrollment_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "lesson" RENAME CONSTRAINT "lesson_moduleId_fkey" TO "lesson_module_id_fkey";

-- RenameForeignKey
ALTER TABLE "lesson_quiz" RENAME CONSTRAINT "_LessonToQuiz_A_fkey" TO "lesson_quiz_lesson_id_fkey";

-- RenameForeignKey
ALTER TABLE "lesson_quiz" RENAME CONSTRAINT "_LessonToQuiz_B_fkey" TO "lesson_quiz_quiz_id_fkey";

-- RenameForeignKey
ALTER TABLE "module" RENAME CONSTRAINT "module_courseId_fkey" TO "module_course_id_fkey";

-- RenameForeignKey
ALTER TABLE "platform_permission" RENAME CONSTRAINT "platform_permissions_platform_role_id_fkey" TO "platform_permission_platform_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "session" RENAME CONSTRAINT "session_userId_fkey" TO "session_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "user" RENAME CONSTRAINT "user_roleId_fkey" TO "user_role_id_fkey";

-- RenameIndex
ALTER INDEX "account_userId_idx" RENAME TO "account_user_id_idx";

-- RenameIndex
ALTER INDEX "ai_chats_status_updated_at_idx" RENAME TO "ai_chat_status_updated_at_idx";

-- RenameIndex
ALTER INDEX "ai_chats_type_status_updated_at_idx" RENAME TO "ai_chat_type_status_updated_at_idx";

-- RenameIndex
ALTER INDEX "ai_chats_user_id_type_updated_at_idx" RENAME TO "ai_chat_user_id_type_updated_at_idx";

-- RenameIndex
ALTER INDEX "ai_chats_user_id_updated_at_idx" RENAME TO "ai_chat_user_id_updated_at_idx";

-- RenameIndex
ALTER INDEX "ai_chat_messages_chat_id_created_at_idx" RENAME TO "ai_chat_message_chat_id_created_at_idx";

-- RenameIndex
ALTER INDEX "ai_chat_messages_role_idx" RENAME TO "ai_chat_message_role_idx";

-- RenameIndex
ALTER INDEX "ai_chat_messages_user_id_created_at_idx" RENAME TO "ai_chat_message_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "course_archivedAt_idx" RENAME TO "course_archived_at_idx";

-- RenameIndex
ALTER INDEX "course_deletedAt_idx" RENAME TO "course_deleted_at_idx";

-- RenameIndex
ALTER INDEX "course_permissions_course_id_course_role_id_enabled_idx" RENAME TO "course_permission_course_id_course_role_id_enabled_idx";

-- RenameIndex
ALTER INDEX "course_permissions_course_id_course_role_id_permission_key" RENAME TO "course_permission_course_id_course_role_id_permission_key";

-- RenameIndex
ALTER INDEX "enrollment_courseId_idx" RENAME TO "enrollment_course_id_idx";

-- RenameIndex
ALTER INDEX "enrollment_courseId_roleId_idx" RENAME TO "enrollment_course_id_role_id_idx";

-- RenameIndex
ALTER INDEX "enrollment_memberId_idx" RENAME TO "enrollment_member_id_idx";

-- RenameIndex
ALTER INDEX "enrollment_roleId_idx" RENAME TO "enrollment_role_id_idx";

-- RenameIndex
ALTER INDEX "file_inventory_course_id_deletedAt_idx" RENAME TO "file_inventory_course_id_deleted_at_idx";

-- RenameIndex
ALTER INDEX "file_inventory_course_id_status_uploadedAt_idx" RENAME TO "file_inventory_course_id_status_uploaded_at_idx";

-- RenameIndex
ALTER INDEX "file_inventory_user_id_deletedAt_idx" RENAME TO "file_inventory_user_id_deleted_at_idx";

-- RenameIndex
ALTER INDEX "file_inventory_user_id_status_uploadedAt_idx" RENAME TO "file_inventory_user_id_status_uploaded_at_idx";

-- RenameIndex
ALTER INDEX "_LessonToQuiz_B_index" RENAME TO "lesson_quiz_quiz_id_idx";

-- RenameIndex
ALTER INDEX "platform_permissions_platform_role_id_enabled_idx" RENAME TO "platform_permission_platform_role_id_enabled_idx";

-- RenameIndex
ALTER INDEX "platform_permissions_platform_role_id_permission_key" RENAME TO "platform_permission_platform_role_id_permission_key";

-- RenameIndex
ALTER INDEX "session_userId_idx" RENAME TO "session_user_id_idx";
