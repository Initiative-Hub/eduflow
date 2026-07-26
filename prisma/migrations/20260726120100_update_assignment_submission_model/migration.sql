-- DropIndex
DROP INDEX "assignment_submission_assignment_student_key";

-- CreateIndex
CREATE INDEX "assignment_submission_assignment_student_created_idx" ON "assignment_submission"("assignment_id", "student_id", "created_at" DESC);
