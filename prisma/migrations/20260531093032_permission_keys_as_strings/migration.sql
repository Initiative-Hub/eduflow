-- AlterTable
ALTER TABLE "course_permissions" ALTER COLUMN "permission" TYPE TEXT USING "permission"::text;

-- AlterTable
ALTER TABLE "platform_permissions" ALTER COLUMN "permission" TYPE TEXT USING "permission"::text;

-- DropEnum
DROP TYPE "CoursePermissionKey";

-- DropEnum
DROP TYPE "PlatformPermissionKey";
