import { apiClient } from '@/lib/api';
import type { LoginFormData } from './login.config';

type SocialProvider = 'google';

type SocialSignInResult = {
  url: string;
};

export const loginService = {
  login: async (data: LoginFormData) => {
    return apiClient.post('/auth/login', data);
  },
  signInWithSocial: async (provider: SocialProvider, callbackURL = '/') => {
    return apiClient.post<SocialSignInResult>(`/auth/social/${provider}`, {
      callbackURL,
    });
  },
};
