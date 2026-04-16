/*
  Warnings:

  - The values [ENABLE_DISABLE_COURSE] on the enum `CoursePermissionKey` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CoursePermissionKey_new" AS ENUM ('MANAGE_MEMBERS', 'EDIT_CONTENT', 'VIEW_ANALYTICS', 'GRADE_ASSESSMENTS');
ALTER TABLE "course_permissions" ALTER COLUMN "permission" TYPE "CoursePermissionKey_new" USING ("permission"::text::"CoursePermissionKey_new");
ALTER TYPE "CoursePermissionKey" RENAME TO "CoursePermissionKey_old";
ALTER TYPE "CoursePermissionKey_new" RENAME TO "CoursePermissionKey";
DROP TYPE "public"."CoursePermissionKey_old";
COMMIT;
