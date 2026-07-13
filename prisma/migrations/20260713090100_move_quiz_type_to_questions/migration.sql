ALTER TABLE "quiz"
ADD COLUMN "question_counts" JSONB NOT NULL DEFAULT '{}';

UPDATE "quiz"
SET "question_counts" = jsonb_build_object("sub_type"::text, "question_count");

ALTER TABLE "quiz"
DROP COLUMN "category",
DROP COLUMN "sub_type";
