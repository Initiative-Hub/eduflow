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
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      id: teacherUserId,
      email: 'teacher@example.com',
      name: 'Teacher User',
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
    where: { email: 'student@example.com' },
    update: {},
    create: {
      id: studentUserId,
      email: 'student@example.com',
      name: 'Student User',
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

  console.log({ adminUser, teacherUser, studentUser });
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
