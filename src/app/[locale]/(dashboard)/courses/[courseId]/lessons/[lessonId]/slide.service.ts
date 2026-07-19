import axios from 'axios';
import { apiClient } from '@/lib/api/api-client';

export interface SlideTemplate {
  name: string;
  description?: string;
  palette?: string[];
}

export interface TemplateCategoryMetadata {
  description?: string;
  when_to_use?: string;
  prompt_hint?: string;
  content_guidance?: string[];
}

export const slideService = {
  getTemplates: (): Promise<SlideTemplate[]> => {
    return apiClient.get<SlideTemplate[]>('/v1/ai/templates', {
      headers: { 'Cache-Control': 'no-store' },
    });
  },

  getTemplatePreviews: (
    collectionName: string
  ): Promise<Record<string, string>> => {
    return apiClient.get<Record<string, string>>(
      `/v1/ai/templates/${collectionName}/previews`,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },

  getTemplateCategories: (
    collectionName: string
  ): Promise<{
    categories: string[];
    is_custom: boolean;
    metadata?: Record<string, TemplateCategoryMetadata>;
  }> => {
    return apiClient.get<{
      categories: string[];
      is_custom: boolean;
      metadata?: Record<string, TemplateCategoryMetadata>;
    }>(`/v1/ai/templates/${collectionName}/categories`, {
      headers: { 'Cache-Control': 'no-store' },
    });
  },

  importTemplate: async (
    file: File,
    name?: string
  ): Promise<{ message: string }> => {
    const baseUrl = (
      process.env.NEXT_PUBLIC_EXTERNAL_SERVICE_URL || 'http://localhost:8000'
    ).replace(/\/$/, '');

    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    // 1. Post direct to Python backend
    const response = await axios.post<{ job_id: string; status: string }>(
      `${baseUrl}/slides/templates/import`,
      formData
    );

    const queued = response.data;
    const pollIntervalMs = 3000;
    const maxPolls = 200;

    // 2. Poll progress directly from frontend browser
    for (let index = 0; index < maxPolls; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusRes = await axios.get<{
        status: 'queued' | 'running' | 'done' | 'error';
        message?: string;
      }>(`${baseUrl}/slides/templates/import/${queued.job_id}`);

      if (statusRes.data.status === 'done') {
        const collectionName =
          name || file.name.substring(0, file.name.lastIndexOf('.'));

        // 3. Clear Next.js previews cache
        try {
          await apiClient.post('/v1/ai/templates/clear-cache', {
            collectionName,
          });
        } catch (cacheErr) {
          console.warn(
            'Failed to clear Next.js template previews cache:',
            cacheErr
          );
        }

        return { message: 'Template collection imported successfully!' };
      }

      if (statusRes.data.status === 'error') {
        throw new Error(statusRes.data.message || 'Import job failed');
      }
    }

    throw new Error('Import job timed out');
  },

  downloadPptxBlob: (deckId: string): Promise<Blob> => {
    return apiClient.get<Blob>(`/v1/ai/slides/${deckId}/pptx`, {
      responseType: 'blob',
      headers: { 'Cache-Control': 'no-store' },
    });
  },
};
