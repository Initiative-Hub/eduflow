import type { SeedUserDefinition, SeedUserKey } from './types';

export const seedUserDefinition: Record<SeedUserKey, SeedUserDefinition[]> = {
  admin: [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'password123',
      platformRole: 'ADMIN',
    },
  ],
  teacher: [
    {
      email: 'teacher@example.com',
      name: 'Teacher User',
      password: 'password123',
      platformRole: 'TEACHER',
    },
    {
      email: 'teacher01@example.com',
      name: 'Teacher 01',
      password: 'password123',
      platformRole: 'TEACHER',
    },
    {
      email: 'teacher02@example.com',
      name: 'Teacher 02',
      password: 'password123',
      platformRole: 'TEACHER',
    },
    {
      email: 'teacher03@example.com',
      name: 'Teacher 03',
      password: 'password123',
      platformRole: 'TEACHER',
    },
    {
      email: 'teacher04@example.com',
      name: 'Teacher 04',
      password: 'password123',
      platformRole: 'TEACHER',
    },
    {
      email: 'teacher05@example.com',
      name: 'Teacher 05',
      password: 'password123',
      platformRole: 'TEACHER',
    },
  ],
  student: [
    {
      email: 'student@example.com',
      name: 'Student User',
      password: 'password123',
      platformRole: 'STUDENT',
    },
    {
      email: 'student01@example.com',
      name: 'Student 01',
      password: 'password123',
      platformRole: 'STUDENT',
    },
    {
      email: 'student02@example.com',
      name: 'Student 02',
      password: 'password123',
      platformRole: 'STUDENT',
    },
    {
      email: 'student03@example.com',
      name: 'Student 03',
      password: 'password123',
      platformRole: 'STUDENT',
    },
    {
      email: 'student04@example.com',
      name: 'Student 04',
      password: 'password123',
      platformRole: 'STUDENT',
    },
    {
      email: 'student05@example.com',
      name: 'Student 05',
      password: 'password123',
      platformRole: 'STUDENT',
    },
  ],
};
