/*
  Warnings:

  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformRoleName" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "CourseRoleName" AS ENUM ('OWNER', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "PlatformPermissionKey" AS ENUM ('MANAGE_USERS', 'ENABLE_DISABLE_COURSE', 'MANAGE_PLATFORM_SETTINGS');

-- CreateEnum
CREATE TYPE "CoursePermissionKey" AS ENUM ('MANAGE_MEMBERS', 'EDIT_CONTENT', 'ENABLE_DISABLE_COURSE', 'VIEW_ANALYTICS', 'GRADE_ASSESSMENTS');

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_roleId_fkey";

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Role";

-- CreateTable
CREATE TABLE "platform_role" (
    "id" TEXT NOT NULL,
    "name" "PlatformRoleName" NOT NULL,

    CONSTRAINT "platform_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_role" (
    "id" TEXT NOT NULL,
    "name" "CourseRoleName" NOT NULL,

    CONSTRAINT "course_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_permissions" (
    "id" TEXT NOT NULL,
    "platform_role_id" TEXT NOT NULL,
    "permission" "PlatformPermissionKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_permissions" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "course_role_id" TEXT NOT NULL,
    "permission" "CoursePermissionKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "cloudStorage" TEXT,
    "vector_db_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_name_key" ON "platform_role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "course_role_name_key" ON "course_role"("name");

-- CreateIndex
CREATE INDEX "platform_permissions_platform_role_id_enabled_idx" ON "platform_permissions"("platform_role_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "platform_permissions_platform_role_id_permission_key" ON "platform_permissions"("platform_role_id", "permission");

-- CreateIndex
CREATE INDEX "course_permissions_course_id_course_role_id_enabled_idx" ON "course_permissions"("course_id", "course_role_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "course_permissions_course_id_course_role_id_permission_key" ON "course_permissions"("course_id", "course_role_id", "permission");

-- CreateIndex
CREATE INDEX "file_inventory_userId_idx" ON "file_inventory"("userId");

-- CreateIndex
CREATE INDEX "enrollment_studentId_idx" ON "enrollment"("studentId");

-- CreateIndex
CREATE INDEX "enrollment_roleId_idx" ON "enrollment"("roleId");

-- CreateIndex
CREATE INDEX "enrollment_courseId_roleId_idx" ON "enrollment"("courseId", "roleId");

-- CreateIndex
CREATE INDEX "enrollment_courseId_idx" ON "enrollment"("courseId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_permissions" ADD CONSTRAINT "platform_permissions_platform_role_id_fkey" FOREIGN KEY ("platform_role_id") REFERENCES "platform_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_permissions" ADD CONSTRAINT "course_permissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_permissions" ADD CONSTRAINT "course_permissions_course_role_id_fkey" FOREIGN KEY ("course_role_id") REFERENCES "course_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_inventory" ADD CONSTRAINT "file_inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "course_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
