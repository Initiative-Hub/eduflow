import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';

function getExternalServiceUrl(): string {
  return (process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000').replace(
    /\/$/,
    ''
  );
}

/**
 * @swagger
 * /api/v1/ai/templates/{collectionName}/categories:
 *   get:
 *     tags:
 *       - AI Templates
 *     summary: List layout-type category names for a template collection
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category names for the collection
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(
  async (
    _req: Request,
    _session,
    { params }: { params: Promise<{ collectionName: string }> }
  ) => {
    try {
      const { collectionName } = await params;
      const baseUrl = getExternalServiceUrl();
      const res = await fetch(
        `${baseUrl}/slides/templates/${encodeURIComponent(collectionName)}/categories`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        return errorResponse(
          'INTERNAL_ERROR',
          'Failed to fetch collection categories',
          res.status
        );
      }
      const data = await res.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Collection categories error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to fetch collection categories',
        500
      );
    }
  }
);
