-- Rename plural or implicit relation tables to singular snake_case names.
ALTER TABLE "platform_permissions" RENAME TO "platform_permission";
ALTER TABLE "course_permissions" RENAME TO "course_permission";
ALTER TABLE "ai_chats" RENAME TO "ai_chat";
ALTER TABLE "ai_chat_messages" RENAME TO "ai_chat_message";
ALTER TABLE "_LessonToQuiz" RENAME TO "lesson_quiz";

-- Standardize Better Auth core columns.
ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "user" RENAME COLUMN "roleId" TO "role_id";

ALTER TABLE "session" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "session" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "session" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "session" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "session" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "session" RENAME COLUMN "userId" TO "user_id";

ALTER TABLE "account" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "account" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "account" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "account" RENAME COLUMN "accessToken" TO "access_token";
ALTER TABLE "account" RENAME COLUMN "refreshToken" TO "refresh_token";
ALTER TABLE "account" RENAME COLUMN "idToken" TO "id_token";
ALTER TABLE "account" RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "account" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "verification" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "verification" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "verification" RENAME COLUMN "updatedAt" TO "updated_at";

-- Standardize permission and inventory columns.
ALTER TABLE "platform_permission" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "platform_permission" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "course_permission" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "course_permission" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "file_inventory" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "file_inventory" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "file_inventory" RENAME COLUMN "uploadedAt" TO "uploaded_at";
ALTER TABLE "file_inventory" RENAME COLUMN "deletedAt" TO "deleted_at";

-- Standardize course content columns.
ALTER TABLE "course" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "course" RENAME COLUMN "isPublished" TO "is_published";
ALTER TABLE "course" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "course" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "course" RENAME COLUMN "archivedAt" TO "archived_at";
ALTER TABLE "course" RENAME COLUMN "deletedAt" TO "deleted_at";

ALTER TABLE "enrollment" RENAME COLUMN "memberId" TO "member_id";
ALTER TABLE "enrollment" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "enrollment" RENAME COLUMN "courseId" TO "course_id";

ALTER TABLE "module" RENAME COLUMN "courseId" TO "course_id";
ALTER TABLE "lesson" RENAME COLUMN "moduleId" TO "module_id";

-- Standardize explicit quiz/lesson join columns.
ALTER TABLE "lesson_quiz" RENAME COLUMN "A" TO "lesson_id";
ALTER TABLE "lesson_quiz" RENAME COLUMN "B" TO "quiz_id";
