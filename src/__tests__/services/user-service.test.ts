import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { UserService } from '@/services/UserService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformRole: {
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRole', () => {
    it('should update role correctly for valid role STUDENT', async () => {
      const mockRole = { id: 'role-1', name: 'STUDENT' };
      const mockUser = {
        id: 'user-1',
        name: 'Test Student',
        role: mockRole,
      };

      vi.mocked(prisma.platformRole.findUnique).mockResolvedValue(
        mockRole as any
      );
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const result = await UserService.updateRole('user-1', 'STUDENT');

      expect(prisma.platformRole.findUnique).toHaveBeenCalledWith({
        where: { name: 'STUDENT' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { roleId: 'role-1' },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should update role correctly for valid role TEACHER', async () => {
      const mockRole = { id: 'role-2', name: 'TEACHER' };
      const mockUser = {
        id: 'user-2',
        name: 'Test Teacher',
        role: mockRole,
      };

      vi.mocked(prisma.platformRole.findUnique).mockResolvedValue(
        mockRole as any
      );
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const result = await UserService.updateRole('user-2', 'TEACHER');

      expect(prisma.platformRole.findUnique).toHaveBeenCalledWith({
        where: { name: 'TEACHER' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { roleId: 'role-2' },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw an error for invalid role (e.g., ADMIN)', async () => {
      vi.mocked(prisma.platformRole.findUnique).mockResolvedValue(null);

      await expect(UserService.updateRole('user-3', 'ADMIN')).rejects.toThrow(
        'Role ADMIN not found'
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw an error for completely random role string', async () => {
      vi.mocked(prisma.platformRole.findUnique).mockResolvedValue(null);

      await expect(UserService.updateRole('user-4', 'GUEST')).rejects.toThrow(
        'Role GUEST not found'
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should propagate errors from the data-access layer', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.platformRole.findUnique).mockRejectedValue(dbError);

      await expect(UserService.updateRole('user-1', 'STUDENT')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
