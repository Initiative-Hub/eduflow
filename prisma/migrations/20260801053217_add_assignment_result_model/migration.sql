-- CreateTable
CREATE TABLE "assignment_result" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "source_submission_id" TEXT,
    "published_by_id" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_result_source_submission_idx" ON "assignment_result"("source_submission_id");

-- CreateIndex
CREATE INDEX "assignment_result_published_by_idx" ON "assignment_result"("published_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_result_assignment_student_key" ON "assignment_result"("assignment_id", "student_id");

-- AddForeignKey
ALTER TABLE "assignment_result" ADD CONSTRAINT "assignment_result_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_result" ADD CONSTRAINT "assignment_result_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_result" ADD CONSTRAINT "assignment_result_source_submission_id_fkey" FOREIGN KEY ("source_submission_id") REFERENCES "assignment_submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_result" ADD CONSTRAINT "assignment_result_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
