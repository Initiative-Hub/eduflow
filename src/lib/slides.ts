/**
 * Client for the Python external slide-skills service. Submits a presentation
 * plan, polls the generation job to completion, and retrieves the rendered deck.
 */

export interface SlidePlanItem {
  /** Layout type produced by the planner (mapped to the service's `category`). */
  layoutType: string;
  slideTitle: string;
  bindings: Record<string, unknown>;
}

export interface DeckPlan {
  title: string;
  slides: SlidePlanItem[];
  /** Palette selection: "auto", "corporate", "modern", etc. */
  palette?: string;
}

/** Token/cost usage for a generation job, as reported by slide_skills. */
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
  /** S3 object key when the deck was archived to storage. */
  s3Key?: string;
}

interface JobResponse {
  status: 'queued' | 'running' | 'done' | 'error';
  result?: {
    deck_id: string;
    slides?: unknown[];
    usage?: DeckUsage;
    warnings?: string[];
    s3_key?: string;
  } | null;
  message?: string | null;
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 240_000;

function getBaseUrl(): string {
  return (process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000').replace(
    /\/$/,
    ''
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Submits a slide plan to the external service and waits for the rendered deck.
 *
 * The planner emits `layoutType` per slide; the service expects `category`, so
 * we map it here before sending.
 */
export async function generateDeckFromPlan(
  plan: DeckPlan
): Promise<GeneratedDeck> {
  const baseUrl = getBaseUrl();

  const payload = {
    title: plan.title,
    palette: plan.palette ?? 'auto',
    slides: plan.slides.map((slide) => ({
      category: slide.layoutType,
      slideTitle: slide.slideTitle,
      bindings: slide.bindings ?? {},
    })),
  };

  const submitRes = await fetch(`${baseUrl}/slides/generate-from-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    console.error('Slide generation submit error:', errorText);
    throw new Error(`Failed to submit slide plan: ${submitRes.statusText}`);
  }

  const { job_id: jobId } = (await submitRes.json()) as { job_id: string };
  if (!jobId) {
    throw new Error('Slide service did not return a job id');
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(`${baseUrl}/slides/jobs/${jobId}`);
    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      console.error('Slide job status error:', errorText);
      throw new Error(`Failed to poll slide job: ${statusRes.statusText}`);
    }

    const job = (await statusRes.json()) as JobResponse;

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
  }

  throw new Error('Slide generation timed out');
}

import { StorageService } from '@/services/StorageService';

/**
 * Fetches the rendered HTML for a generated deck.
 */
export async function getDeckHtml(deckId: string): Promise<string> {
  return StorageService.getSlideDeck(deckId);
}

/**
 * Saves the edited HTML for a generated deck directly.
 */
export async function saveDeckHtml(
  deckId: string,
  html: string
): Promise<void> {
  await StorageService.saveSlideDeck(deckId, html);
}
