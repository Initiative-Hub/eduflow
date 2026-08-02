import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { googleDriveExportRequestSchema } from '@/lib/validations/google-drive-export.schema';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';
import { GoogleDriveExportArtifactService } from '@/services/google-drive/GoogleDriveExportArtifactService';
import { GoogleDriveExportError } from '@/services/google-drive/GoogleDriveExportError';
import { GoogleDriveExportService } from '@/services/google-drive/GoogleDriveExportService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = withAuth(async (request, session) => {
  const startedAt = Date.now();
  const parsed = googleDriveExportRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid Google Drive export request.',
      400,
      parsed.error.flatten()
    );
  }

  try {
    const [artifact, context] = await Promise.all([
      GoogleDriveExportArtifactService.resolve({
        source: parsed.data.source,
        userId: session.user.id,
      }),
      GoogleDriveDestinationService.getExportContext(session.user.id),
    ]);
    const result = await GoogleDriveExportService.uploadArtifact({
      artifact,
      context,
      requestId: parsed.data.requestId,
      userId: session.user.id,
    });
    console.info('[GoogleDriveExport]', {
      destinationKind: result.destination.kind,
      durationMs: Date.now() - startedAt,
      resultCode: 'SUCCESS',
      sourceKind: parsed.data.source.kind,
      uploadMode: result.reused
        ? 'reused'
        : artifact.bytes.byteLength <= 5 * 1024 * 1024
          ? 'multipart'
          : 'resumable',
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof GoogleDriveExportError) {
      console.info('[GoogleDriveExport]', {
        durationMs: Date.now() - startedAt,
        resultCode: error.code,
        sourceKind: parsed.data.source.kind,
      });
      return errorResponse(
        error.code,
        error.message,
        error.status,
        error.details
      );
    }
    const message =
      error instanceof Error ? error.message : 'Google Drive export failed.';
    if (message === 'Google Drive is not connected.') {
      console.info('[GoogleDriveExport]', {
        durationMs: Date.now() - startedAt,
        resultCode: 'DRIVE_NOT_CONNECTED',
        sourceKind: parsed.data.source.kind,
      });
      return errorResponse('DRIVE_NOT_CONNECTED', message, 409);
    }
    if (message === 'Google Drive export destination is not configured.') {
      console.info('[GoogleDriveExport]', {
        durationMs: Date.now() - startedAt,
        resultCode: 'DRIVE_DESTINATION_REQUIRED',
        sourceKind: parsed.data.source.kind,
      });
      return errorResponse('DRIVE_DESTINATION_REQUIRED', message, 409);
    }
    console.info('[GoogleDriveExport]', {
      durationMs: Date.now() - startedAt,
      resultCode: 'DRIVE_UPLOAD_FAILED',
      sourceKind: parsed.data.source.kind,
    });
    return errorResponse('DRIVE_UPLOAD_FAILED', message, 502);
  }
});
