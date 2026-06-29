import fs from 'node:fs';
import path from 'node:path';
import { StorageService } from './StorageService';

export class SlideService {
  /**
   * Retrieves SVG slide previews for a given template collection.
   * Checks the local filesystem templates first (for development/default templates),
   * then falls back to S3 templates via the StorageService.
   */
  static async getTemplatePreviews(
    collectionName: string
  ): Promise<Record<string, string>> {
    const svgs: Record<string, string> = {};

    // 1. Try local filesystem fallback first (helpful in local dev)
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

    // 2. If no local templates found, try fetching from S3 via StorageService
    if (Object.keys(svgs).length === 0) {
      try {
        const prefix = `templates/${collectionName}/`;
        const keys = await StorageService.listPrefixKeys(prefix);

        for (const key of keys) {
          if (key.endsWith('.svg')) {
            const body = await StorageService.getObjectString(key);
            if (body) {
              const name = path.parse(key).name;
              svgs[name] = body;
            }
          }
        }
      } catch (err) {
        console.error(
          `[SlideService] Failed to fetch previews from S3 for ${collectionName}:`,
          err
        );
      }
    }

    return svgs;
  }
}
