-- Add lesson inline-edit AI access to existing course roles.
INSERT INTO "course_permission" (
    "id",
    "course_id",
    "course_role_id",
    "permission",
    "enabled",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    c."id",
    cr."id",
    'AI_USE_LESSON_EDITOR',
    cr."name" <> 'STUDENT',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "course" c
CROSS JOIN "course_role" cr
WHERE cr."name" IN ('COURSE_OWNER', 'TEACHER', 'STUDENT')
ON CONFLICT ("course_id", "course_role_id", "permission") DO UPDATE
SET
    "enabled" = EXCLUDED."enabled",
    "updated_at" = CURRENT_TIMESTAMP;
