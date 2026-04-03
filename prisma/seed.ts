// prisma/seed.ts
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const hashedPasswordAdmin = await bcrypt.hash('securepassword123', 10);
  const hashedPasswordMember = await bcrypt.hash('memberpassword123', 10);
  const hashedPasswordTeacher = await bcrypt.hash('teacherpass123', 10);
  const hashedPasswordStudent = await bcrypt.hash('studentpass123', 10);

  // 1. Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'ADMIN',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'USER',
    },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'TEACHER',
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'STUDENT',
    },
  });

  console.log(
    `Created roles: ${adminRole.name}, ${userRole.name}, ${teacherRole.name}, ${studentRole.name}`
  );

  // 2. Create users and assign roles
  const user1 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPasswordAdmin,
      roleId: adminRole.id,
      posts: {
        create: [
          {
            id: randomUUID(),
            title: 'First admin post',
            content: 'Admin post content...',
            published: true,
          },
        ],
      },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'member@example.com',
      name: 'Member User',
      password: hashedPasswordMember,
      roleId: userRole.id,
      posts: {
        create: [
          {
            id: randomUUID(),
            title: 'Hello community',
            content: 'I am a new member.',
            published: true,
          },
          {
            id: randomUUID(),
            title: 'Unpublished draft',
            content: 'This content is not public yet.',
            published: false,
          },
        ],
      },
    },
  });

  // Additional teacher and student accounts
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'teacher@example.com',
      name: 'Teacher User',
      password: hashedPasswordTeacher,
      roleId: teacherRole.id,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'student@example.com',
      name: 'Student User',
      password: hashedPasswordStudent,
      roleId: studentRole.id,
    },
  });

  console.log({ user1, user2, teacherUser, studentUser });

  console.log({ user1, user2 });
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
