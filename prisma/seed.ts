// prisma/seed.ts
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../src/generated/prisma';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const hashedPasswordAdmin = await hashPassword('securepassword123');
  const hashedPasswordMember = await hashPassword('memberpassword123');
  const hashedPasswordTeacher = await hashPassword('teacherpass123');
  const hashedPasswordStudent = await hashPassword('studentpass123');

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
      roleId: adminRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: 'admin@example.com',
            providerId: 'credential',
            password: hashedPasswordAdmin,
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
      roleId: userRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: 'member@example.com',
            providerId: 'credential',
            password: hashedPasswordMember,
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
      roleId: teacherRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: 'teacher@example.com',
            providerId: 'credential',
            password: hashedPasswordTeacher,
          },
        ],
      },
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'student@example.com',
      name: 'Student User',
      roleId: studentRole.id,
      emailVerified: true,
      accounts: {
        create: [
          {
            id: randomUUID(),
            accountId: 'student@example.com',
            providerId: 'credential',
            password: hashedPasswordStudent,
          },
        ],
      },
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
