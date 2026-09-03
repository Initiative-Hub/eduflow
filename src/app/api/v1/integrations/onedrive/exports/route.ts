import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { oneDriveExportRequestSchema } from '@/lib/validations/onedrive-export.schema';
import { CloudDriveExportArtifactService } from '@/services/cloud-drive/CloudDriveExportArtifactService';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveExportError } from '@/services/onedrive/OneDriveExportError';
import { OneDriveExportService } from '@/services/onedrive/OneDriveExportService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = withAuth(async (request, session) => {
  const startedAt = Date.now();
  const parsed = oneDriveExportRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid OneDrive export request.',
      400,
      parsed.error.flatten()
    );
  }

  try {
    const [artifact, context] = await Promise.all([
      CloudDriveExportArtifactService.resolve({
        source: parsed.data.source,
        userId: session.user.id,
      }),
      OneDriveDestinationService.getExportContext(session.user.id),
    ]);
    const result = await OneDriveExportService.uploadArtifact({
      artifact,
      context,
      requestId: parsed.data.requestId,
      userId: session.user.id,
    });
    console.info('[OneDriveExport]', {
      destinationKind: result.destination.kind,
      durationMs: Date.now() - startedAt,
      resultCode: 'SUCCESS',
      sourceKind: parsed.data.source.kind,
      uploadMode: result.reused
        ? 'reused'
        : artifact.bytes.byteLength <= 4 * 1024 * 1024
          ? 'small'
          : 'session',
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof OneDriveExportError) {
      console.info('[OneDriveExport]', {
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
      error instanceof Error ? error.message : 'OneDrive export failed.';
    if (message === 'OneDrive is not connected.') {
      return errorResponse('DRIVE_NOT_CONNECTED', message, 409);
    }
    if (message === 'OneDrive export destination is not configured.') {
      return errorResponse('DRIVE_DESTINATION_REQUIRED', message, 409);
    }
    return errorResponse('DRIVE_UPLOAD_FAILED', message, 502);
  }
});
