const GAMMA_API_BASE_URL = 'https://public-api.gamma.app/v1.0';
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const MAX_INPUT_TEXT_LENGTH = 50_000;
const MAX_ADDITIONAL_INSTRUCTIONS_LENGTH = 5_000;

const COLLECTION_STYLE_HINTS: Record<string, string> = {
  starter: 'Use a neutral, professional classroom presentation style.',
  neon_dark: 'Use a dark, high-contrast visual style with bold modern accents.',
  vintage:
    'Use a warm editorial look with academic vintage cues and restrained typography.',
  clean_light:
    'Use a clean, light, minimal visual style with strong clarity and structure.',
  pastel_pop:
    'Use a friendly pastel visual style that still feels polished and presentation-ready.',
  illustrative_culture:
    'Use warm illustrated storytelling visuals suited to cultural and humanities topics.',
  minimalist_gradient:
    'Use a sleek modern style with gradients, polished layouts, and a product-pitch feel.',
  organic_streets:
    'Use organic editorial storytelling visuals with travel-inspired motifs.',
  cultural_folk:
    'Use warm earth-toned cultural storytelling visuals with grounded, human-centered layouts.',
};

export type GammaExportFormat = 'pptx' | 'pdf' | 'png';
type GammaGenerationStatus = 'pending' | 'completed' | 'failed';
type GammaTextMode = 'generate' | 'condense' | 'preserve';

type GammaCredits = {
  deducted?: number;
  remaining?: number;
};

type GammaCreateGenerationResponse = {
  generationId: string;
  warnings?: string[] | string;
};

type GammaGenerationStatusResponse = {
  generationId: string;
  status: GammaGenerationStatus;
  gammaId?: string;
  gammaUrl?: string;
  exportUrl?: string;
  credits?: GammaCredits;
  error?: {
    message?: string;
  };
};

export type GammaGenerationResult = {
  generationId: string;
  gammaId?: string;
  gammaUrl: string;
  exportUrl?: string;
  credits?: GammaCredits;
  status: 'completed';
  warnings: string[];
};

export type GenerateGammaPresentationInput = {
  title: string;
  duration: string;
  context?: string;
  collection?: string;
  themeId?: string;
  exportAs?: GammaExportFormat;
  lessonTitle?: string;
  lessonContent?: unknown;
  language?: string;
  apiKey?: string;
};

function normalizeWarnings(warnings?: string[] | string): string[] {
  if (!warnings) {
    return [];
  }

  return Array.isArray(warnings) ? warnings : [warnings];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

function extractPlainText(input: unknown): string {
  const fragments: string[] = [];

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        fragments.push(trimmed);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    const record = value as Record<string, unknown>;

    if (typeof record.text === 'string') {
      walk(record.text);
    }

    if (typeof record.title === 'string') {
      walk(record.title);
    }

    if (typeof record.description === 'string') {
      walk(record.description);
    }

    if (typeof record.alt === 'string') {
      walk(record.alt);
    }

    if ('attrs' in record) {
      walk(record.attrs);
    }

    if ('content' in record) {
      walk(record.content);
    }
  };

  walk(input);

  const text = fragments
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text) {
    return text;
  }

  if (typeof input === 'object' && input) {
    return JSON.stringify(input);
  }

  return '';
}

function detectLanguage(input: GenerateGammaPresentationInput) {
  if (input.language) {
    return input.language;
  }

  const combined = [input.title, input.lessonTitle, input.context]
    .filter(Boolean)
    .join(' ');

  const vietnamesePattern =
    /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

  return vietnamesePattern.test(combined) ? 'vi' : 'en';
}

function estimateCardCount(duration: string) {
  const minutes = Number.parseInt(duration.match(/\d+/)?.[0] ?? '10', 10);

  if (minutes <= 5) {
    return 3;
  }

  if (minutes <= 10) {
    return 4;
  }

  if (minutes <= 15) {
    return 5;
  }

  if (minutes <= 30) {
    return 8;
  }

  if (minutes <= 45) {
    return 10;
  }

  if (minutes <= 60) {
    return 12;
  }

  if (minutes <= 90) {
    return 16;
  }

  return 20;
}

function chooseTextMode(lessonText: string): GammaTextMode {
  if (lessonText.length >= 1_500) {
    return 'condense';
  }

  if (lessonText.length >= 300) {
    return 'preserve';
  }

  return 'generate';
}

function buildInputText(input: GenerateGammaPresentationInput) {
  const lessonText = extractPlainText(input.lessonContent);
  const parts = [`Presentation topic: ${input.title}`];

  if (input.lessonTitle && input.lessonTitle !== input.title) {
    parts.push(`Lesson title: ${input.lessonTitle}`);
  }

  if (lessonText) {
    parts.push(`Lesson source material:\n${lessonText}`);
  }

  return truncate(parts.join('\n\n'), MAX_INPUT_TEXT_LENGTH);
}

function buildAdditionalInstructions(input: GenerateGammaPresentationInput) {
  const instructions: string[] = [
    `Create a polished presentation for a ${input.duration} lesson.`,
    'Keep each card concise, easy to teach from, and visually structured for a classroom audience.',
    'Include a clear opening, logically ordered teaching points, and a short recap near the end.',
  ];

  if (input.context?.trim()) {
    instructions.push(`Teacher instructions: ${input.context.trim()}`);
  }

  if (input.collection && input.collection !== 'auto') {
    const styleHint =
      COLLECTION_STYLE_HINTS[input.collection] ??
      `Use a visual direction inspired by the "${input.collection}" style collection.`;
    instructions.push(styleHint);
  }

  return truncate(instructions.join('\n'), MAX_ADDITIONAL_INSTRUCTIONS_LENGTH);
}

async function parseGammaError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };

    return payload.error?.message ?? payload.message;
  } catch {
    try {
      return await response.text();
    } catch {
      return undefined;
    }
  }
}

async function gammaRequest<T>(
  path: string,
  init: RequestInit,
  apiKey: string
): Promise<T> {
  const response = await fetch(`${GAMMA_API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await parseGammaError(response);

    if (response.status === 401) {
      throw new Error(
        details || 'Gamma API rejected the API key. Check GAMMA_API_KEY.'
      );
    }

    if (response.status === 402) {
      throw new Error(
        details || 'Gamma API credits are exhausted for this workspace.'
      );
    }

    if (response.status === 403) {
      throw new Error(
        details || 'Gamma API access is not available for this workspace.'
      );
    }

    throw new Error(
      details || `Gamma API request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

export class GammaService {
  static async getPresentationExport(
    generationId: string,
    apiKey = process.env.GAMMA_API_KEY
  ) {
    if (!apiKey) {
      throw new Error('Missing GAMMA_API_KEY environment variable.');
    }

    const statusResult = await gammaRequest<GammaGenerationStatusResponse>(
      `/generations/${generationId}`,
      {
        method: 'GET',
      },
      apiKey
    );

    if (statusResult.status !== 'completed' || !statusResult.exportUrl) {
      throw new Error('Gamma presentation export is not ready.');
    }

    return {
      exportUrl: statusResult.exportUrl,
      gammaUrl: statusResult.gammaUrl,
      generationId: statusResult.generationId,
    };
  }

  static async generatePresentation(
    input: GenerateGammaPresentationInput
  ): Promise<GammaGenerationResult> {
    const apiKey = input.apiKey ?? process.env.GAMMA_API_KEY;

    if (!apiKey) {
      throw new Error('Missing GAMMA_API_KEY environment variable.');
    }

    const inputText = buildInputText(input);
    const lessonText = extractPlainText(input.lessonContent);
    const textMode = chooseTextMode(lessonText);
    const language = detectLanguage(input);
    const numCards = estimateCardCount(input.duration);

    const createPayload = {
      inputText,
      additionalInstructions: buildAdditionalInstructions(input),
      textMode,
      format: 'presentation' as const,
      numCards,
      themeId: input.themeId,
      exportAs: input.exportAs ?? 'pptx',
      textOptions: {
        amount: textMode === 'condense' ? 'brief' : 'medium',
        audience: 'students',
        language,
        tone: 'professional, educational',
      },
      imageOptions: {
        source: 'aiGenerated',
      },
    };

    const createResult = await gammaRequest<GammaCreateGenerationResponse>(
      '/generations',
      {
        method: 'POST',
        body: JSON.stringify(createPayload),
      },
      apiKey
    );

    const warnings = normalizeWarnings(createResult.warnings);

    for (let attempt = 0; attempt < DEFAULT_MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await sleep(DEFAULT_POLL_INTERVAL_MS);
      }

      const statusResult = await gammaRequest<GammaGenerationStatusResponse>(
        `/generations/${createResult.generationId}`,
        {
          method: 'GET',
        },
        apiKey
      );

      if (statusResult.status === 'failed') {
        throw new Error(
          statusResult.error?.message ||
            'Gamma failed to generate the presentation.'
        );
      }

      if (statusResult.status === 'completed') {
        if (!statusResult.gammaUrl) {
          throw new Error(
            'Gamma generation completed but did not return a gammaUrl.'
          );
        }

        return {
          generationId: statusResult.generationId,
          gammaId: statusResult.gammaId,
          gammaUrl: statusResult.gammaUrl,
          exportUrl: statusResult.exportUrl,
          credits: statusResult.credits,
          status: 'completed',
          warnings,
        };
      }
    }

    throw new Error(
      'Gamma generation timed out while waiting for the presentation to finish.'
    );
  }
}
