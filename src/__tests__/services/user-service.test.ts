import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { UserService } from '@/services/UserService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    platformRole: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage/avatar', () => ({
  createAvatarReadSignedUrl: vi.fn(({ objectKey }) =>
    Promise.resolve(objectKey)
  ),
}));

describe('UserService', () => {
  const prismaMock = prisma as unknown as {
    platformRole: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

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

      prismaMock.platformRole.findUnique.mockResolvedValue(mockRole as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);

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

      prismaMock.platformRole.findUnique.mockResolvedValue(mockRole as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);

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
      prismaMock.platformRole.findUnique.mockResolvedValue(null);

      await expect(UserService.updateRole('user-3', 'ADMIN')).rejects.toThrow(
        'Role ADMIN not found'
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw an error for completely random role string', async () => {
      prismaMock.platformRole.findUnique.mockResolvedValue(null);

      await expect(UserService.updateRole('user-4', 'GUEST')).rejects.toThrow(
        'Role GUEST not found'
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should propagate errors from the data-access layer', async () => {
      const dbError = new Error('Database connection failed');
      prismaMock.platformRole.findUnique.mockRejectedValue(dbError);

      await expect(UserService.updateRole('user-1', 'STUDENT')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getBasicInfo', () => {
    it('should return basic info when user exists', async () => {
      const mockUser = {
        id: 'user-10',
        email: 'jane@example.com',
        name: 'Jane Doe',
        role: { name: 'TEACHER' },
        image: 'https://cdn.example.com/jane.png',
        emailVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await UserService.getBasicInfo('user-10');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-10' },
        include: { role: true },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role.name,
        image: mockUser.image,
        emailVerified: mockUser.emailVerified,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getBasicInfo('missing-user')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
