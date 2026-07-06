import fs from 'node:fs';
import path from 'node:path';
import {
  FILE_DEFAULT_TEMPLATES_BUCKET_NAME,
  FILE_TEMPLATES_BUCKET_NAME,
} from '@/lib/storage/file-storage';
import { StorageService } from './StorageService';

// In-memory cache for slide template previews
const previewsCache = new Map<string, Record<string, string>>();

export class SlideService {
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
        const defaultCollections = new Set([
          'templates',
          'default',
          'starter',
          'neon_dark',
          'vintage',
          'clean_light',
          'pastel_pop',
        ]);
        const bucketName = defaultCollections.has(collectionName.toLowerCase())
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
}
