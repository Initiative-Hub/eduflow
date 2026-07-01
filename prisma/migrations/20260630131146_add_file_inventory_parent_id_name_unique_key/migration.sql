/*
  Active inventory name uniqueness must be enforced manually in SQL because
  Prisma schema cannot express:
  - partial unique indexes (`deleted_at IS NULL`)
  - case-insensitive uniqueness (`LOWER(name)`)
  - separate handling for nullable `parent_id` at the root level
*/

-- Personal inventory roots (`course_id IS NULL`, `parent_id IS NULL`)
CREATE UNIQUE INDEX "file_inventory_user_root_name_active_key"
ON "file_inventory" ("user_id", LOWER("name"))
WHERE "course_id" IS NULL
  AND "parent_id" IS NULL
  AND "deleted_at" IS NULL;

-- Personal inventory children (`course_id IS NULL`, `parent_id IS NOT NULL`)
CREATE UNIQUE INDEX "file_inventory_user_parent_name_active_key"
ON "file_inventory" ("user_id", "parent_id", LOWER("name"))
WHERE "course_id" IS NULL
  AND "parent_id" IS NOT NULL
  AND "deleted_at" IS NULL;

-- Course inventory roots (`course_id IS NOT NULL`, `parent_id IS NULL`)
CREATE UNIQUE INDEX "file_inventory_course_root_name_active_key"
ON "file_inventory" ("course_id", LOWER("name"))
WHERE "course_id" IS NOT NULL
  AND "parent_id" IS NULL
  AND "deleted_at" IS NULL;

-- Course inventory children (`course_id IS NOT NULL`, `parent_id IS NOT NULL`)
CREATE UNIQUE INDEX "file_inventory_course_parent_name_active_key"
ON "file_inventory" ("course_id", "parent_id", LOWER("name"))
WHERE "course_id" IS NOT NULL
  AND "parent_id" IS NOT NULL
  AND "deleted_at" IS NULL;
