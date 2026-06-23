import type { PrismaClient } from '../../../src/generated/prisma';
import type { PlatformRoleName, SeededPlatformRoles } from '../role/types';

export type SeedUserKey = 'admin' | 'teacher' | 'student';

export type SeedUserDefinition = {
  email: string;
  name: string;
  password: string;
  platformRole: PlatformRoleName;
};

export type SeedUser = {
  id: string;
  email: string;
  name: string;
};

export type SeededUsers = Record<SeedUserKey, SeedUser[]>;

export type SeedUsersInput = {
  prisma: PrismaClient;
  platformRoles: SeededPlatformRoles;
};
