import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';

export const dynamic = 'force-dynamic';

function getExternalServiceUrl(): string {
  return (process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000').replace(
    /\/$/,
    ''
  );
}

/**
 * @swagger
 * /api/v1/ai/templates:
 *   get:
 *     tags:
 *       - AI Templates
 *     summary: Get all available slide template collections
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: List of template collections retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(
  withRoles(['TEACHER'], async () => {
    try {
      const baseUrl = getExternalServiceUrl();
      const response = await fetch(`${baseUrl}/slides/templates/collections`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        return errorResponse(
          'INTERNAL_ERROR',
          `Failed to fetch templates from slide service: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      console.error('Fetch templates error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve templates',
        500
      );
    }
  })
);
