import { apiClient } from '@/lib/api';
import type { ProfileFormData } from './profile.config';

export const profileService = {
  update: async (data: ProfileFormData) => apiClient.patch('/profile', data),
};
