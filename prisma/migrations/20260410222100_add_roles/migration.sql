INSERT INTO "platform_role" ("id", "name") VALUES
(gen_random_uuid(), 'ADMIN'),
(gen_random_uuid(), 'TEACHER'),
(gen_random_uuid(), 'STUDENT');

INSERT INTO "course_role" ("id", "name") VALUES
(gen_random_uuid(), 'OWNER'),
(gen_random_uuid(), 'TEACHER'),
(gen_random_uuid(), 'STUDENT');