-- CreateEnum
CREATE TYPE "assignment_submission_status" AS ENUM ('draft', 'submitted', 'graded');

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "due_at" TIMESTAMP(3),
    "max_points" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submission" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "graded_by_id" TEXT,
    "status" "assignment_submission_status" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submission_file" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_submission_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_course_id_deleted_at_idx" ON "assignment"("course_id", "deleted_at");

-- CreateIndex
CREATE INDEX "assignment_created_by_id_idx" ON "assignment"("created_by_id");

-- CreateIndex
CREATE INDEX "assignment_submission_assignment_id_status_idx" ON "assignment_submission"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "assignment_submission_student_id_idx" ON "assignment_submission"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submission_assignment_student_key" ON "assignment_submission"("assignment_id", "student_id");

-- CreateIndex
CREATE INDEX "assignment_submission_file_file_id_idx" ON "assignment_submission_file"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submission_file_submission_file_key" ON "assignment_submission_file"("submission_id", "file_id");

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_graded_by_id_fkey" FOREIGN KEY ("graded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission_file" ADD CONSTRAINT "assignment_submission_file_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission_file" ADD CONSTRAINT "assignment_submission_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
