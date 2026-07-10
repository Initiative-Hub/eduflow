import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Serverless Functions must have a maxDuration between 1 and 300 for plan hobby.

/**
 * @swagger
 * /api/v1/ai/templates/import:
 *   post:
 *     tags:
 *       - AI Templates
 *     summary: Import template collection (ZIP, SVG, or PPTX) to slide service and sync to S3
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Template file to import (ZIP, SVG, or PPTX)
 *               name:
 *                 type: string
 *                 description: Optional name override for the imported collection
 *     responses:
 *       200:
 *         description: Template imported successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const POST = withRoles(['TEACHER'], async (req: Request) => {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Request must be multipart/form-data',
        400
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file) {
      return errorResponse('VALIDATION_ERROR', 'File is required', 400);
    }

    const filename = file.name || '';
    const allowedExtensions = ['.zip', '.svg', '.pptx'];
    const extension = filename
      .substring(filename.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Only ZIP, SVG, or PPTX files are supported',
        400
      );
    }

    const result = await SlideService.importTemplateCollection(file, name);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Template import error:', error);
    if (error instanceof Error) {
      if (error.message === 'Import job timed out') {
        return errorResponse('INTERNAL_ERROR', error.message, 504);
      }

      if (
        error.message === 'Failed to poll import job' ||
        error.message.includes('service restarted')
      ) {
        return errorResponse('INTERNAL_ERROR', error.message, 500);
      }
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to import templates', 500);
  }
});
