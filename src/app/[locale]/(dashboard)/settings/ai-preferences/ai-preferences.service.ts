import { apiClient } from '@/lib/api';
import type { UpdateAiPreferencesInput } from '@/lib/validations/ai-preferences.schema';

export interface AiPreferencesResponse {
  customInstructions: string | null;
}

export const AI_PREFERENCES_QUERY_KEY = ['ai-preferences'] as const;

export const aiPreferencesService = {
  get: () => apiClient.get<AiPreferencesResponse>('v1/user/ai-preferences'),

  update: (input: UpdateAiPreferencesInput) =>
    apiClient.patch<AiPreferencesResponse>('v1/user/ai-preferences', input),
};
