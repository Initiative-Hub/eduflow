-- The legacy Study whole-chat flow has been replaced by the generic AI chat share flow.
DELETE FROM "shared_resource" WHERE "resource_type" = 'STUDY_CHAT';

CREATE TYPE "ShareResourceType_new" AS ENUM ('STUDY_INTERACTIVE_CONTENT', 'AI_CHAT');

ALTER TABLE "shared_resource"
  ALTER COLUMN "resource_type" TYPE "ShareResourceType_new"
  USING ("resource_type"::text::"ShareResourceType_new");

DROP TYPE "ShareResourceType";

ALTER TYPE "ShareResourceType_new" RENAME TO "ShareResourceType";
