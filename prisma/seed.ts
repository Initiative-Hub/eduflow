// prisma/seed.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import { seedDemoChats } from './seeds/chat';
import { seedDemoCourses } from './seeds/course';
import {
  seedCoursePermissions,
  seedPlatformPermissions,
} from './seeds/permission';
import { seedCourseRoles, seedPlatformRoles } from './seeds/role';
import { seedUsers } from './seeds/user';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  const platformRoles = await seedPlatformRoles({ prisma });
  console.log(
    `Created roles: ${platformRoles.ADMIN.name}, ${platformRoles.TEACHER.name}, ${platformRoles.STUDENT.name}`
  );

  const platformPermissionCount = await seedPlatformPermissions({
    prisma,
    platformRoles,
  });
  console.log(`Seeded ${platformPermissionCount} platform permissions`);

  const users = await seedUsers({ prisma, platformRoles });
  console.log({
    adminUser: users.admin,
    teacherUser: users.teacher,
    studentUser: users.student,
  });

  const courseRoles = await seedCourseRoles({ prisma });
  console.log(
    `Created course roles: ${courseRoles.COURSE_OWNER.name}, ${courseRoles.TEACHER.name}, ${courseRoles.STUDENT.name}`
  );

  const courseCount = await seedDemoCourses({
    prisma,
    teacherUserId: users.teacher.id,
    studentUserId: users.student.id,
    courseOwnerRoleId: courseRoles.COURSE_OWNER.id,
    courseStudentRoleId: courseRoles.STUDENT.id,
  });
  console.log(`Seeded ${courseCount} demo courses`);

  const coursePermissionCount = await seedCoursePermissions({
    prisma,
    courseRoles,
  });
  console.log(`Seeded ${coursePermissionCount} course permissions`);

  const chatCount = await seedDemoChats({
    prisma,
    teacherUserId: users.teacher.id,
    studentUserId: users.student.id,
  });
  console.log(`Seeded ${chatCount} AI chats`);

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
