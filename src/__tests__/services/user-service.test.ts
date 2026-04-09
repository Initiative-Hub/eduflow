import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateUserRole } from '@/app/data-access/user';
import { UserService } from '@/app/services/UserService';

vi.mock('@/app/data-access/user', () => ({
  updateUserRole: vi.fn(),
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRole', () => {
    it('should update role correctly for valid role STUDENT', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test Student',
        role: { name: 'STUDENT' },
      };
      vi.mocked(updateUserRole).mockResolvedValue(mockUser as any);

      const result = await UserService.updateRole('user-1', 'STUDENT');

      expect(updateUserRole).toHaveBeenCalledWith('user-1', 'STUDENT');
      expect(result).toEqual(mockUser);
    });

    it('should update role correctly for valid role TEACHER', async () => {
      const mockUser = {
        id: 'user-2',
        name: 'Test Teacher',
        role: { name: 'TEACHER' },
      };
      vi.mocked(updateUserRole).mockResolvedValue(mockUser as any);

      const result = await UserService.updateRole('user-2', 'TEACHER');

      expect(updateUserRole).toHaveBeenCalledWith('user-2', 'TEACHER');
      expect(result).toEqual(mockUser);
    });

    it('should throw an error for invalid role (e.g., ADMIN)', async () => {
      await expect(UserService.updateRole('user-3', 'ADMIN')).rejects.toThrow(
        'Invalid role selected'
      );

      expect(updateUserRole).not.toHaveBeenCalled();
    });

    it('should throw an error for completely random role string', async () => {
      await expect(UserService.updateRole('user-4', 'GUEST')).rejects.toThrow(
        'Invalid role selected'
      );

      expect(updateUserRole).not.toHaveBeenCalled();
    });

    it('should propagate errors from the data-access layer', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(updateUserRole).mockRejectedValue(dbError);

      await expect(UserService.updateRole('user-1', 'STUDENT')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
