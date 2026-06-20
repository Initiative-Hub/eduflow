import type { SeedUserDefinition } from './types';

export const seededUsers: { [key: string]: SeedUserDefinition } = {
  admin: {
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'password123',
    platformRole: 'ADMIN',
  },
  teacher: {
    email: 'teacher@example.com',
    name: 'Teacher User',
    password: 'password123',
    platformRole: 'TEACHER',
  },
  student: {
    email: 'student@example.com',
    name: 'Student User',
    password: 'password123',
    platformRole: 'STUDENT',
  },
};
