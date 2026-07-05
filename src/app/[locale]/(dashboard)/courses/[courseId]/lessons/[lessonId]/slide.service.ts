import { apiClient } from '@/lib/api/api-client';

export interface SlideTemplate {
  name: string;
  description?: string;
  palette?: string[];
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

  importTemplate: (file: File, name?: string): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }
    return apiClient.post<{ message: string }>(
      '/v1/ai/templates/import',
      formData
    );
  },

  downloadPptxBlob: (deckId: string): Promise<Blob> => {
    return apiClient.get<Blob>(`/v1/ai/slides/${deckId}/pptx`, {
      responseType: 'blob',
      headers: { 'Cache-Control': 'no-store' },
    });
  },
};
