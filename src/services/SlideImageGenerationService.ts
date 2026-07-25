import * as z from 'zod';
import type {
  SlideAiImageRequest,
  SlideAiImageResponse,
} from '@/lib/validation/slide-ai-image';
import { StorageService } from '@/services/StorageService';

/**
 * Tried in order until one returns an image. Image providers reject requests
 * from unsupported regions (Google AI Studio answers 400 "User location is not
 * supported", OpenAI 403 "Country, region, or territory not supported"), so a
 * single model makes the feature unavailable in those regions.
 */
const IMAGE_MODELS = [
  'google/gemini-2.5-flash-image',
  'bytedance-seed/seedream-4.5',
] as const;
const MAX_GENERATED_IMAGE_BYTES = 12 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/**
 * Identifies the real image format from its magic bytes.
 *
 * Providers do not honour the requested `output_format`: seedream returns JPEG
 * even when PNG is requested. Trusting the request (or the response's
 * `media_type`) therefore mislabels the bytes, so the format is sniffed and the
 * declared type is only used as a cross-check.
 */
function detectImageType(bytes: Uint8Array): string | null {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

const openRouterImageResponseSchema = z.object({
  data: z
    .array(
      z.object({
        b64_json: z.string().min(1),
        media_type: z.string().optional(),
      })
    )
    .min(1),
});

function decodeBase64Image(value: string): {
  bytes: Uint8Array;
  contentType: string;
} {
  const dataUrlMatch = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  const encoded = dataUrlMatch?.[2] ?? value;
  const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'));

  if (bytes.byteLength === 0) {
    throw new Error('Generated image was empty');
  }
  if (bytes.byteLength > MAX_GENERATED_IMAGE_BYTES) {
    throw new Error(
      `Generated image is ${bytes.byteLength} bytes, over the ${MAX_GENERATED_IMAGE_BYTES} byte limit`
    );
  }

  const contentType = detectImageType(bytes);
  if (!contentType || !SUPPORTED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      `Generated image is not a supported image format (first bytes: ${Buffer.from(
        bytes.slice(0, 4)
      ).toString('hex')})`
    );
  }

  return { bytes, contentType };
}

export class SlideImageGenerationService {
  /**
   * Requests an image, moving to the next model when a provider refuses. The
   * provider's own message is preserved so failures are diagnosable rather than
   * surfacing as a bare status code.
   */
  private static async generateWithFallback(
    apiKey: string,
    request: SlideAiImageRequest
  ): Promise<{ bytes: Uint8Array; contentType: string }> {
    const failures: string[] = [];

    for (const model of IMAGE_MODELS) {
      const response = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: request.prompt,
          aspect_ratio: request.aspectRatio,
          output_format: 'png',
          n: 1,
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        failures.push(
          `${model}: ${response.status} ${detail.slice(0, 300).trim()}`
        );
        console.warn(
          `[SlideImageGeneration] ${model} failed with ${response.status}: ${detail.slice(0, 300)}`
        );
        continue;
      }

      const parsed = openRouterImageResponseSchema.safeParse(
        await response.json()
      );
      if (!parsed.success) {
        failures.push(`${model}: response contained no image data`);
        continue;
      }

      return decodeBase64Image(parsed.data.data[0].b64_json);
    }

    throw new Error(
      `OpenRouter image generation failed. ${failures.join(' | ')}`
    );
  }

  static async generate(
    request: SlideAiImageRequest
  ): Promise<SlideAiImageResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key for provider "openrouter"');
    }

    const image = await SlideImageGenerationService.generateWithFallback(
      apiKey,
      request
    );

    const mediaId = crypto.randomUUID();
    await StorageService.saveSlideGeneratedImage({
      deckId: request.deckId,
      mediaId,
      bytes: image.bytes,
      contentType: image.contentType,
    });

    return {
      imageUrl: `/api/v1/ai/slides/${request.deckId}/media/${mediaId}`,
    };
  }
}
