import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EXTERNAL_SERVICE_URL = (
  process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const renderSlideSchema = z.object({
  layoutType: z.string().min(1),
  slideTitle: z.string().default(''),
  bindings: z.record(z.string(), z.any()).default({}),
  collection: z.string().optional(),
});

/**
 * POST /api/v1/ai/slides/render-slide
 * Deterministic single-slide re-render from bindings (no AI) — used by the
 * interactive preview editor ("+ Add item", inline edits). Proxies to the
 * external slide service and returns { svg }.
 */
export const POST = withAuth(async (req) => {
  try {
    const parsed = renderSlideSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const res = await fetch(`${EXTERNAL_SERVICE_URL}/slides/render-slide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { message: data?.detail || 'Slide render failed' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('render-slide proxy error:', error);
    return NextResponse.json(
      { message: 'Failed to render slide' },
      { status: 500 }
    );
  }
});
