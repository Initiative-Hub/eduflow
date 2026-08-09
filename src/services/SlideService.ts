import {
  createObjectReadSignedUrl,
  FILE_DEFAULT_TEMPLATES_BUCKET_NAME,
  FILE_TEMPLATES_BUCKET_NAME,
} from '@/lib/storage/file-storage';

/**
 * Cached preview object keys per collection. Signed URLs are generated per
 * request instead of cached, because they expire.
 */
const previewsCache = new Map<string, TemplatePreviewObject[]>();

interface TemplatePreviewObject {
  category: string;
  variant: string;
  key: string;
  bucket: string;
}

export interface TemplatePreview {
  category: string;
  variant: string;
  url: string;
}

export const DEFAULT_TEMPLATE_COLLECTIONS = new Set([
  'templates',
  'default',
  'starter',
  'neon_dark',
  'vintage',
  'clean_light',
  'pastel_pop',
  'illustrative_culture',
  'minimalist_gradient',
  'cultural_folk',
  'organic_streets',
  'electric_green_white',
  'green_environment_care',
  'rmit_red_modern',
  'startup_neon_pitch',
  'professional_focus',
]);

export interface SlideTemplate {
  name: string;
  description?: string;
  palette?: string[];
  is_custom?: boolean;
}

export interface TemplateCategoryMetadata {
  description?: string;
  when_to_use?: string;
  prompt_hint?: string;
  content_guidance?: string[];
}

export interface SlidePlanItem {
  layoutType: string;
  slideTitle: string;
  bindings: Record<string, unknown>;
}

export interface DeckPlan {
  title: string;
  slides: SlidePlanItem[];
  palette?: string;
  collection?: string;
}

export interface DeckUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  requests?: number;
  estimated_cost_usd?: number;
  report?: string;
}

export interface GeneratedDeck {
  deckId: string;
  slides: unknown[];
  warnings: string[];
  usage?: DeckUsage;
  s3Key?: string;
}

type JobResponse = {
  status: 'queued' | 'running' | 'done' | 'error';
  result?: {
    deck_id: string;
    slides?: unknown[];
    usage?: DeckUsage;
    warnings?: string[];
    s3_key?: string;
  } | null;
  message?: string | null;
};

type TemplateCategoriesResponse = {
  categories: string[];
  is_custom: boolean;
  description?: string;
  metadata?: Record<string, TemplateCategoryMetadata>;
};

type PlanningCollectionData = TemplateCategoriesResponse & {
  collection: string;
};

export class SlideService {
  static getExternalServiceUrl(): string {
    return (
      process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000'
    ).replace(/\/$/, '');
  }

  /**
   * Clears the cached template previews (all or a specific collection).
   */
  static clearCache(collectionName?: string) {
    if (collectionName) {
      previewsCache.delete(collectionName);
    } else {
      previewsCache.clear();
    }
  }

  /**
   * Resolves the rasterized PNG preview for every category in a collection.
   *
   * Previews are generated and cached as PNGs by the slide service, then served
   * as signed URLs. Sending SVG markup instead shipped hundreds of KB per
   * collection and forced the browser to lay out one live SVG tree per slide.
   */
  static async getTemplatePreviews(
    collectionName: string
  ): Promise<TemplatePreview[]> {
    let objects = previewsCache.get(collectionName);

    if (!objects) {
      const fallbackBucket = DEFAULT_TEMPLATE_COLLECTIONS.has(
        collectionName.toLowerCase()
      )
        ? FILE_DEFAULT_TEMPLATES_BUCKET_NAME
        : FILE_TEMPLATES_BUCKET_NAME;

      const response = await fetch(
        `${SlideService.getExternalServiceUrl()}/slides/templates/${encodeURIComponent(
          collectionName
        )}/previews`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load template previews: ${response.statusText}`
        );
      }

      const payload = (await response.json()) as {
        bucket?: string;
        previews?: { category: string; variant: string; key: string }[];
      };

      objects = (payload.previews ?? []).map((preview) => ({
        category: preview.category,
        variant: preview.variant,
        key: preview.key,
        bucket: payload.bucket || fallbackBucket,
      }));

      if (objects.length > 0) {
        previewsCache.set(collectionName, objects);
      }
    }

    return Promise.all(
      objects.map(async (object) => ({
        category: object.category,
        variant: object.variant,
        url: await createObjectReadSignedUrl({
          objectKey: object.key,
          bucketName: object.bucket,
        }),
      }))
    );
  }

  static async getTemplateCollections(): Promise<SlideTemplate[]> {
    const response = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/collections`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch templates from slide service: ${response.statusText}`
      );
    }

    return response.json();
  }

  static async getTemplateCategories(
    collectionName: string
  ): Promise<TemplateCategoriesResponse> {
    const response = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/${encodeURIComponent(collectionName)}/categories`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch collection categories');
    }

    return response.json();
  }

  static async getPlanningTemplateCategories(
    collectionName: string
  ): Promise<string[] | undefined> {
    const data = await SlideService.getTemplateCategories(collectionName);
    return data.is_custom ? data.categories : undefined;
  }

  static async getPlanningCollectionData(
    collectionName?: string
  ): Promise<PlanningCollectionData> {
    const resolvedCollection =
      !collectionName || collectionName === 'auto'
        ? 'templates'
        : collectionName;
    const data = await SlideService.getTemplateCategories(resolvedCollection);

    return {
      collection: resolvedCollection,
      ...data,
    };
  }

  static isBuiltInCollectionName(collectionName?: string): boolean {
    if (!collectionName) {
      return true;
    }

    return DEFAULT_TEMPLATE_COLLECTIONS.has(collectionName.toLowerCase());
  }

  static async getStyleCollections(): Promise<
    Record<string, string> | undefined
  > {
    try {
      const collections = await SlideService.getTemplateCollections();
      const map = collections.reduce<Record<string, string>>(
        (acc, collection) => {
          if (collection.name) {
            acc[collection.name] =
              collection.description || `Style '${collection.name}'`;
          }
          return acc;
        },
        {}
      );

      return Object.keys(map).length > 0 ? map : undefined;
    } catch {
      return undefined;
    }
  }

  static async getDefaultStyleCollections(): Promise<
    Record<string, string> | undefined
  > {
    const styles = await SlideService.getStyleCollections();
    if (!styles) {
      return undefined;
    }

    const filtered = Object.fromEntries(
      Object.entries(styles).filter(([name]) =>
        DEFAULT_TEMPLATE_COLLECTIONS.has(name.toLowerCase())
      )
    );

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  static async generateDeckFromPlan(plan: DeckPlan): Promise<GeneratedDeck> {
    const payload = {
      title: plan.title,
      palette: plan.palette ?? 'auto',
      collection: plan.collection ?? 'starter',
      slides: plan.slides.map((slide) => ({
        category: slide.layoutType,
        slideTitle: slide.slideTitle,
        bindings: slide.bindings ?? {},
      })),
    };

    const response = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/generate-from-plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate slides: ${response.statusText}`);
    }

    const job = (await response.json()) as JobResponse;

    if (job.status === 'done' && job.result) {
      return {
        deckId: job.result.deck_id,
        slides: job.result.slides ?? [],
        warnings: job.result.warnings ?? [],
        usage: job.result.usage,
        s3Key: job.result.s3_key,
      };
    }

    if (job.status === 'error') {
      throw new Error(job.message || 'Slide generation failed');
    }

    throw new Error('Unexpected response status from slide service');
  }

  static async getDeckPptx(deckId: string): Promise<ArrayBuffer> {
    const response = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/decks/${deckId}/pptx`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to generate PPTX from slide service');
    }

    return response.arrayBuffer();
  }

  static async importTemplateCollection(
    file: File,
    name?: string | null,
    source: 'auto' | 'layouts' | 'slides' = 'auto'
  ): Promise<{ status: 'success'; imported: unknown }> {
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, file.name || 'template');
    if (name) {
      forwardFormData.append('name', name);
    }
    forwardFormData.append('source', source);

    const baseUrl = SlideService.getExternalServiceUrl();
    const response = await fetch(`${baseUrl}/slides/templates/import`, {
      method: 'POST',
      body: forwardFormData,
    });

    if (!response.ok) {
      throw new Error(`External service failed: ${response.statusText}`);
    }

    const queued = (await response.json()) as {
      job_id: string;
      status: 'queued' | 'running';
    };

    const pollIntervalMs = 3000;
    const maxPolls = 200;

    for (let index = 0; index < maxPolls; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusResponse = await fetch(
        `${baseUrl}/slides/templates/import/${queued.job_id}`,
        { cache: 'no-store' }
      );

      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          throw new Error(
            'Import job was lost (service restarted). Please try again.'
          );
        }
        throw new Error('Failed to poll import job');
      }

      const job = (await statusResponse.json()) as {
        status: 'queued' | 'running' | 'done' | 'error';
        result?: unknown;
        message?: string;
      };

      if (job.status === 'done') {
        SlideService.clearCache();
        return { status: 'success', imported: job.result };
      }

      if (job.status === 'error') {
        throw new Error(job.message || 'Import job failed');
      }
    }

    throw new Error('Import job timed out');
  }
}
