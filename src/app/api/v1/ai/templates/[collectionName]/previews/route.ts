import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  withRoles(
    ['TEACHER'],
    async (
      _req: Request,
      _sessionData,
      { params }: { params: Promise<{ collectionName: string }> }
    ) => {
      try {
        const { collectionName } = await params;
        const svgs = await SlideService.getTemplatePreviews(collectionName);
        return NextResponse.json(svgs, { status: 200 });
      } catch (error) {
        console.error('Fetch template previews error:', error);
        return errorResponse(
          'INTERNAL_ERROR',
          'Failed to retrieve template previews',
          500
        );
      }
    }
  )
);
