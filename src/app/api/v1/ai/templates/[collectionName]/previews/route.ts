import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';

export const GET = withRoles(
  ['TEACHER'],
  async (
    _req: Request,
    _sessionData,
    { params }: { params: Promise<{ collectionName: string }> }
  ) => {
    try {
      const { collectionName } = await params;
      const previews = await SlideService.getTemplatePreviews(collectionName);
      return NextResponse.json(previews, {
        status: 200,
        headers: {
          // Signed preview URLs expire, so responses must not be cached beyond
          // their lifetime.
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (error) {
      console.error('Fetch template previews error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve template previews',
        500
      );
    }
  }
);
