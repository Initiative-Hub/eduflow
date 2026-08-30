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
  'pastel_pop',
  'illustrative_culture',
  'minimalist_gradient',
  'cultural_folk',
  'organic_streets',
  'green_environment_care',
  'startup_neon_pitch',
  'professional_focus',
]);

export interface TemplateSlot {
  kind: 'text' | 'image' | 'chart' | 'table';
  name: string;
  type: string;
  desc: string;
  max_chars: number;
  lines: number;
  /** true/false set by a reviewer; null = decide from the slot name */
  bullet: boolean | null;
  x: number;
  y: number;
  w: number;
  h: number;
  font_pt: number;
  warnings: string[];
}

export interface TemplateCategoryInspection {
  category: string;
  variant: string;
  slots: TemplateSlot[];
  warnings: string[];
}

export interface TemplateInspection {
  collection: string;
  categories: TemplateCategoryInspection[];
  warning_count: number;
}

export interface SlotEditPayload {
  category: string;
  variant: string;
  edits: Array<{
    name: string;
    rename?: string;
    type?: string;
    desc?: string;
    max_chars?: number;
    lines?: number;
    bullet?: boolean;
    delete?: boolean;
    kind?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }>;
}

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

    const baseUrl = SlideService.getExternalServiceUrl();
    const response = await fetch(`${baseUrl}/slides/generate-from-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate slides: ${response.statusText}`);
    }

    const queued = (await response.json()) as JobResponse & { job_id?: string };

    // A deck used to be built inside this one request, which meant holding the
    // connection open for the whole run — one model call per slide to pick a
    // layout, plus an image generation per picture slot, all in sequence. Past
    // five minutes undici gave up (UND_ERR_HEADERS_TIMEOUT) and the finished
    // deck was discarded. The build now runs as a job and is polled for, so no
    // single request is long-lived.
    if (queued.status === 'done' && queued.result) {
      return SlideService.toGeneratedDeck(queued.result);
    }
    if (queued.status === 'error') {
      throw new Error(queued.message || 'Slide generation failed');
    }
    if (!queued.job_id) {
      throw new Error('Unexpected response status from slide service');
    }

    const pollIntervalMs = 3000;
    // Generous: a long deck with AI art can legitimately run many minutes, and
    // giving up early throws away work the service is still doing.
    const maxPolls = 400;

    for (let index = 0; index < maxPolls; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusResponse = await fetch(
        `${baseUrl}/slides/jobs/${queued.job_id}`,
        { cache: 'no-store' }
      );

      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          throw new Error(
            'Slide generation job was lost (service restarted). Please try again.'
          );
        }
        throw new Error('Failed to poll slide generation job');
      }

      const job = (await statusResponse.json()) as JobResponse;

      if (job.status === 'done' && job.result) {
        return SlideService.toGeneratedDeck(job.result);
      }
      if (job.status === 'error') {
        throw new Error(job.message || 'Slide generation failed');
      }
    }

    throw new Error('Slide generation timed out');
  }

  private static toGeneratedDeck(
    result: NonNullable<JobResponse['result']>
  ): GeneratedDeck {
    return {
      deckId: result.deck_id,
      slides: result.slides ?? [],
      warnings: result.warnings ?? [],
      usage: result.usage,
      s3Key: result.s3_key,
    };
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

  /** Detected slots + warnings per category, for the template review screen. */
  static async inspectTemplate(
    collectionName: string
  ): Promise<TemplateInspection> {
    const res = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/${encodeURIComponent(collectionName)}/inspect`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error(`Failed to inspect template: ${res.statusText}`);
    }
    return res.json();
  }

  /** The category's slide with every detected slot outlined and labelled. */
  static async getTemplateSlotOverlay(
    collectionName: string,
    category: string,
    variant = 'standard',
    boxes = true,
    editable = false
  ): Promise<{ svg: string }> {
    const res = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/` +
        `${encodeURIComponent(collectionName)}/inspect/` +
        `${encodeURIComponent(category)}/overlay?variant=${encodeURIComponent(variant)}` +
        `&boxes=${boxes ? 'true' : 'false'}&editable=${editable ? 'true' : 'false'}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error(`Failed to render slot overlay: ${res.statusText}`);
    }
    return res.json();
  }

  /** Apply reviewer corrections to a category's slots and sync them to S3. */
  static async updateTemplateSlots(
    collectionName: string,
    payload: SlotEditPayload
  ): Promise<{ applied: string[]; synced: boolean }> {
    const res = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/${encodeURIComponent(collectionName)}/slots`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to update slots: ${res.statusText}`);
    }
    SlideService.clearCache(collectionName);
    return res.json();
  }

  /**
   * Permanently remove one layout from a collection, locally and in S3.
   *
   * The service refuses to remove the last layout, which surfaces as a 400 —
   * pass the message through so the reviewer sees why rather than a generic
   * failure.
   */
  static async deleteTemplateCategory(
    collectionName: string,
    category: string
  ): Promise<{ deleted: boolean; remaining: number }> {
    const res = await fetch(
      `${SlideService.getExternalServiceUrl()}/slides/templates/${encodeURIComponent(collectionName)}/categories/${encodeURIComponent(category)}`,
      { method: 'DELETE', cache: 'no-store' }
    );
    if (!res.ok) {
      const detail = await res
        .json()
        .then((body) => body?.detail)
        .catch(() => null);
      throw new Error(detail || `Failed to delete layout: ${res.statusText}`);
    }
    SlideService.clearCache(collectionName);
    return res.json();
  }

}
