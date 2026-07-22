import fs from 'node:fs';
import path from 'node:path';
import {
  FILE_DEFAULT_TEMPLATES_BUCKET_NAME,
  FILE_TEMPLATES_BUCKET_NAME,
} from '@/lib/storage/file-storage';
import { StorageService } from './StorageService';

// In-memory cache for slide template previews
const previewsCache = new Map<string, Record<string, string>>();

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
]);

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
   * Retrieves SVG slide previews for a given template collection.
   * Checks the local filesystem templates first (for development/default templates),
   * then falls back to S3 templates via the StorageService.
   */
  static async getTemplatePreviews(
    collectionName: string
  ): Promise<Record<string, string>> {
    // 1. Check in-memory cache first
    const cached = previewsCache.get(collectionName);
    if (cached) {
      return cached;
    }

    const svgs: Record<string, string> = {};

    // 2. Try local filesystem fallback first (helpful in local dev)
    const localDir = path.join(
      process.cwd(),
      'external-services',
      'app',
      'services',
      'templates',
      collectionName
    );

    if (fs.existsSync(localDir)) {
      try {
        const files = fs.readdirSync(localDir);
        for (const file of files) {
          if (file.endsWith('.svg')) {
            const filePath = path.join(localDir, file);
            const name = path.parse(file).name;
            svgs[name] = fs.readFileSync(filePath, 'utf-8');
          }
        }
      } catch (err) {
        console.error(
          `[SlideService] Failed to read local templates for ${collectionName}:`,
          err
        );
      }
    }

    // 3. If no local templates found, try fetching from S3 via StorageService
    if (Object.keys(svgs).length === 0) {
      try {
        const bucketName = DEFAULT_TEMPLATE_COLLECTIONS.has(
          collectionName.toLowerCase()
        )
          ? FILE_DEFAULT_TEMPLATES_BUCKET_NAME
          : FILE_TEMPLATES_BUCKET_NAME;

        const prefix = `templates/${collectionName}/`;
        const keys = await StorageService.listPrefixKeys(prefix, bucketName);

        const svgKeys = keys.filter((key) => key.endsWith('.svg'));
        const downloadPromises = svgKeys.map(async (key) => {
          const body = await StorageService.getObjectString(key, bucketName);
          if (body) {
            const name = path.parse(key).name;
            return { name, body };
          }
          return null;
        });

        const results = await Promise.all(downloadPromises);
        for (const res of results) {
          if (res) {
            svgs[res.name] = res.body;
          }
        }
      } catch (err) {
        console.error(
          `[SlideService] Failed to fetch previews from S3 for ${collectionName}:`,
          err
        );
      }
    }

    // Cache the retrieved previews if we found any
    if (Object.keys(svgs).length > 0) {
      previewsCache.set(collectionName, svgs);
    }

    return svgs;
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
    name?: string | null
  ): Promise<{ status: 'success'; imported: unknown }> {
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, file.name || 'template');
    if (name) {
      forwardFormData.append('name', name);
    }

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
