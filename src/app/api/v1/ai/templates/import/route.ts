import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 630; // 10.5 min — covers AI-based PPTX extraction (~10 min)

function getExternalServiceUrl(): string {
  return (process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000').replace(
    /\/$/,
    ''
  );
}

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
export const POST = withAuth(
  withRoles(['TEACHER'], async (req: Request) => {
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

      // Reconstruct FormData to forward to the external service
      const forwardFormData = new FormData();
      forwardFormData.append('file', file, filename);
      if (name) {
        forwardFormData.append('name', name);
      }

      const baseUrl = getExternalServiceUrl();
      const response = await fetch(`${baseUrl}/slides/templates/import`, {
        method: 'POST',
        body: forwardFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Template import forward error:', errorText);
        return errorResponse(
          'INTERNAL_ERROR',
          `External service failed: ${response.statusText}`,
          response.status
        );
      }

      const queued = await response.json();
      const jobId: string = queued.job_id;

      // Poll the job status until done or error (AI processing can take minutes)
      const POLL_INTERVAL_MS = 3000;
      const MAX_POLLS = 200; // up to ~10 minutes for large PPTX with AI classification
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const statusRes = await fetch(
          `${baseUrl}/slides/templates/import/${jobId}`
        );
        if (!statusRes.ok) {
          if (statusRes.status === 404) {
            // Service restarted and lost the in-memory job state
            return errorResponse(
              'INTERNAL_ERROR',
              'Import job was lost (service restarted). Please try again.',
              500
            );
          }
          return errorResponse(
            'INTERNAL_ERROR',
            'Failed to poll import job',
            500
          );
        }

        const job = await statusRes.json();

        if (job.status === 'done') {
          SlideService.clearCache();
          return NextResponse.json(
            { status: 'success', imported: job.result },
            { status: 200 }
          );
        }

        if (job.status === 'error') {
          console.error('Template import job error:', job.message);
          return errorResponse(
            'INTERNAL_ERROR',
            job.message || 'Import job failed',
            500
          );
        }
        // status is 'queued' or 'running' — keep polling
      }

      return errorResponse('INTERNAL_ERROR', 'Import job timed out', 504);
    } catch (error) {
      console.error('Template import error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to import templates', 500);
    }
  })
);
