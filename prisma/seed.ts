// prisma/seed.ts
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../src/generated/prisma';
import {
  COURSE_PERMISSION,
  COURSE_PERMISSION_KEYS,
  type CoursePermissionKey,
  PLATFORM_PERMISSION,
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from '../src/lib/permissions/permission-keys';
import { seedDemoContent } from './seed-demo';
import { DEMO_USERS } from './seed-data/demo-data';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const hashedPasswordAdmin = await hashPassword('password123');
  const hashedPasswordTeacher = await hashPassword('password123');
  const hashedPasswordStudent = await hashPassword('password123');

  // 1. Create roles
  const adminRole = await prisma.platformRole.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'ADMIN',
    },
  });

  const teacherRole = await prisma.platformRole.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'TEACHER',
    },
  });

  const studentRole = await prisma.platformRole.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'STUDENT',
    },
  });

  console.log(
    `Created roles: ${adminRole.name}, ${teacherRole.name}, ${studentRole.name}`
  );

  const courseOwnerRole = await prisma.courseRole.upsert({
    where: { name: 'COURSE_OWNER' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'COURSE_OWNER',
    },
  });

  const courseTeacherRole = await prisma.courseRole.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'TEACHER',
    },
  });

  const courseStudentRole = await prisma.courseRole.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'STUDENT',
    },
  });

  console.log(
    `Created course roles: ${courseOwnerRole.name}, ${courseTeacherRole.name}, ${courseStudentRole.name}`
  );

  const platformRoles = {
    ADMIN: adminRole,
    TEACHER: teacherRole,
    STUDENT: studentRole,
  };

  const platformRolePermissionDefaults: Record<
    string,
    PlatformPermissionKey[]
  > = {
    ADMIN: PLATFORM_PERMISSION_KEYS,
    TEACHER: [
      PLATFORM_PERMISSION.COURSES_CREATE,
      PLATFORM_PERMISSION.AI_USE_CHAT,
      PLATFORM_PERMISSION.AI_USE_WRITING,
      PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE,
    ],
    STUDENT: [
      PLATFORM_PERMISSION.AI_USE_CHAT,
      PLATFORM_PERMISSION.AI_USE_WRITING,
      PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE,
    ],
  };

  const platformPermissions = ['ADMIN', 'TEACHER', 'STUDENT'].flatMap(
    (role) => {
      const defaults = new Set<PlatformPermissionKey>(
        platformRolePermissionDefaults[role]
      );

      return PLATFORM_PERMISSION_KEYS.map((permission) => ({
        platformRoleId: platformRoles[role as keyof typeof platformRoles].id,
        permission,
        enabled: defaults.has(permission),
      }));
    }
  );

  await prisma.platformPermission.createMany({
    data: platformPermissions,
    skipDuplicates: true,
  });

  console.log(`Seeded ${platformPermissions.length} platform permissions`);

  const courseRolePermissionDefaults: Record<string, CoursePermissionKey[]> = {
    COURSE_OWNER: COURSE_PERMISSION_KEYS,
    TEACHER: [
      COURSE_PERMISSION.COURSE_MEMBERS_VIEW,
      COURSE_PERMISSION.COURSE_CONTENT_VIEW,
      COURSE_PERMISSION.COURSE_CONTENT_CREATE,
      COURSE_PERMISSION.COURSE_CONTENT_UPDATE,
      COURSE_PERMISSION.ASSESSMENTS_VIEW,
      COURSE_PERMISSION.ASSESSMENTS_CREATE,
      COURSE_PERMISSION.ASSESSMENTS_UPDATE,
      COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
      COURSE_PERMISSION.ASSESSMENTS_GRADE,
      COURSE_PERMISSION.COURSE_FILES_VIEW,
      COURSE_PERMISSION.COURSE_FILES_MANAGE,
      COURSE_PERMISSION.AI_USE_COURSE_GENERATION,
      COURSE_PERMISSION.COURSE_ANALYTICS_VIEW,
    ],
    STUDENT: [
      COURSE_PERMISSION.COURSE_CONTENT_VIEW,
      COURSE_PERMISSION.ASSESSMENTS_VIEW,
      COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW,
      COURSE_PERMISSION.COURSE_FILES_VIEW,
    ],
  };

  const courseRoles = {
    COURSE_OWNER: courseOwnerRole,
    TEACHER: courseTeacherRole,
    STUDENT: courseStudentRole,
  };

  // 2. Create users and assign roles
  const adminUserId = randomUUID();
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: adminUserId,
      email: 'admin@example.com',
      name: 'Admin User',
      roleId: adminRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: adminUserId,
            providerId: 'credential',
            password: hashedPasswordAdmin,
          },
        ],
      },
    },
  });

  const teacherUserId = randomUUID();
  const teacherUser = await prisma.user.upsert({
    where: { email: DEMO_USERS.teacher.email },
    update: {
      name: DEMO_USERS.teacher.name,
      roleId: teacherRole.id,
      emailVerified: true,
    },
    create: {
      id: teacherUserId,
      email: DEMO_USERS.teacher.email,
      name: DEMO_USERS.teacher.name,
      roleId: teacherRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: teacherUserId,
            providerId: 'credential',
            password: hashedPasswordTeacher,
          },
        ],
      },
    },
  });

  const studentUserId = randomUUID();
  const studentUser = await prisma.user.upsert({
    where: { email: DEMO_USERS.student.email },
    update: {
      name: DEMO_USERS.student.name,
      roleId: studentRole.id,
      emailVerified: true,
    },
    create: {
      id: studentUserId,
      email: DEMO_USERS.student.email,
      name: DEMO_USERS.student.name,
      roleId: studentRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: studentUserId,
            providerId: 'credential',
            password: hashedPasswordStudent,
          },
        ],
      },
    },
  });

  const demoCounts = await seedDemoContent({
    prisma,
    teacherUserId: teacherUser.id,
    studentUserId: studentUser.id,
    courseOwnerRoleId: courseOwnerRole.id,
    courseStudentRoleId: courseStudentRole.id,
  });

  // Course permissions must be created after the demo courses exist.
  const courses = await prisma.course.findMany({ select: { id: true } });
  const coursePermissions = courses.flatMap((course) =>
    ['COURSE_OWNER', 'TEACHER', 'STUDENT'].flatMap((roleName) => {
      const defaults = new Set<CoursePermissionKey>(
        courseRolePermissionDefaults[roleName]
      );

      return COURSE_PERMISSION_KEYS.map((permission) => ({
        courseId: course.id,
        courseRoleId: courseRoles[roleName as keyof typeof courseRoles].id,
        permission,
        enabled: defaults.has(permission),
      }));
    })
  );

  await prisma.coursePermission.createMany({
    data: coursePermissions,
    skipDuplicates: true,
  });

  console.log({ adminUser, teacherUser, studentUser });
  console.log(
    `Seeded ${demoCounts.courseCount} demo courses, ${coursePermissions.length} course permissions, and ${demoCounts.chatCount} AI chats`
  );
  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
