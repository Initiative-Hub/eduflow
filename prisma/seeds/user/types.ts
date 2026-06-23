import type { PrismaClient } from '../../../src/generated/prisma';
import type { PlatformRoleName, SeededPlatformRoles } from '../role/types';

export type SeedUserKey =
  | 'admin'
  | 'teacher'
  | 'teacher01'
  | 'teacher02'
  | 'teacher03'
  | 'teacher04'
  | 'teacher05'
  | 'student'
  | 'student01'
  | 'student02'
  | 'student03'
  | 'student04'
  | 'student05';

export type SeedUserDefinition = {
  email: string;
  name: string;
  password: string;
  platformRole: PlatformRoleName;
};

export type SeedUser = {
  id: string;
  email: string;
  name: string | null;
};

export type SeededUsers = Record<SeedUserKey, SeedUser>;

export type SeedUsersInput = {
  prisma: PrismaClient;
  platformRoles: SeededPlatformRoles;
};
