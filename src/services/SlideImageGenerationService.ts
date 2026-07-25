import * as z from 'zod';
import type {
  SlideAiImageRequest,
  SlideAiImageResponse,
} from '@/lib/validation/slide-ai-image';
import { StorageService } from '@/services/StorageService';

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';
const MAX_GENERATED_IMAGE_BYTES = 12 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function hasExpectedImageSignature(
  bytes: Uint8Array,
  contentType: string
): boolean {
  if (contentType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

const openRouterImageResponseSchema = z.object({
  data: z
    .array(
      z.object({
        b64_json: z.string().min(1),
      })
    )
    .min(1),
});

function decodeBase64Image(value: string): {
  bytes: Uint8Array;
  contentType: string;
} {
  const dataUrlMatch = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  const contentType = dataUrlMatch?.[1]?.toLowerCase() ?? 'image/png';
  const encoded = dataUrlMatch?.[2] ?? value;
  const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'));

  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported generated image type: ${contentType}`);
  }
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_GENERATED_IMAGE_BYTES ||
    !hasExpectedImageSignature(bytes, contentType)
  ) {
    throw new Error('Generated image has invalid content or size');
  }

  return { bytes, contentType };
}

export class SlideImageGenerationService {
  static async generate(
    request: SlideAiImageRequest
  ): Promise<SlideAiImageResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key for provider "openrouter"');
    }

    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
        prompt: request.prompt,
        aspect_ratio: request.aspectRatio,
        output_format: 'png',
        resolution: '1K',
        n: 1,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter image generation failed: ${response.status}`);
    }

    const parsed = openRouterImageResponseSchema.parse(await response.json());
    const image = decodeBase64Image(parsed.data[0].b64_json);

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
