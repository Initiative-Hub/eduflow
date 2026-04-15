import { apiClient } from '@/lib/api';
import type { ProfileFormData } from './profile.config';

export interface UserBasicInfo {
  id: string;
  email: string;
  name: string;
  role: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSecurityInfo {
  provider: string;
  hasPassword: boolean;
  userAgent: string | null;
}

export const profileService = {
  getBasicInfo: async () => apiClient.get<UserBasicInfo>('/v1/user'),
  getSecurityInfo: async () =>
    apiClient.get<UserSecurityInfo>('/v1/user/security-info'),
  update: async (data: ProfileFormData) => apiClient.patch('/v1/user', data),
  setPassword: async (password: string) =>
    apiClient.post('/v1/user/password', { password }),
};
