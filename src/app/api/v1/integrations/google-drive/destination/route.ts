import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { googleDriveDestinationSchema } from '@/lib/validations/google-drive-export.schema';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';

export const PUT = withAuth(async (request, session) => {
  const parsed = googleDriveDestinationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid Google Drive destination.',
      400,
      parsed.error.flatten()
    );
  }

  try {
    const destination = await GoogleDriveDestinationService.setDestination(
      session.user.id,
      parsed.data
    );
    return NextResponse.json({ data: destination });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not update the Google Drive destination.';
    if (message === 'Google Drive is not connected.') {
      return errorResponse('DRIVE_NOT_CONNECTED', message, 409);
    }
    if (message === 'Google Drive destination is not a writable folder.') {
      return errorResponse('DRIVE_DESTINATION_NOT_WRITABLE', message, 403);
    }
    return errorResponse('DRIVE_UPLOAD_FAILED', message, 502);
  }
});
