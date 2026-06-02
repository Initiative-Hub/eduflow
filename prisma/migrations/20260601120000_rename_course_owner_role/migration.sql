-- Rename the built-in course owner role to make it explicit.
ALTER TYPE "CourseRoleName" RENAME VALUE 'OWNER' TO 'COURSE_OWNER';
