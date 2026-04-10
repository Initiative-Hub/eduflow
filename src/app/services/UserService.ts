import type { PlatformRoleName } from '@/generated/prisma';
import { updateUserRole as updateRoleInDb } from '../data-access/user';

export class UserService {
  static async updateRole(userId: string, role: string) {
    const validRoles: string[] = ['STUDENT', 'TEACHER'];

    if (!validRoles.includes(role)) {
      throw new Error('Invalid role selected');
    }

    return await updateRoleInDb(userId, role as PlatformRoleName);
  }
}
