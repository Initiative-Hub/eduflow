import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { oneDriveDestinationSchema } from '@/lib/validations/onedrive-export.schema';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';

export const PUT = withAuth(async (request, session) => {
  const parsed = oneDriveDestinationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid OneDrive destination.',
      400,
      parsed.error.flatten()
    );
  }

  try {
    const destination = await OneDriveDestinationService.setDestination(
      session.user.id,
      parsed.data
    );
    return NextResponse.json({ data: destination });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not update the OneDrive destination.';
    if (message === 'OneDrive is not connected.') {
      return errorResponse('DRIVE_NOT_CONNECTED', message, 409);
    }
    if (message === 'OneDrive destination is not a writable folder.') {
      return errorResponse('DRIVE_DESTINATION_NOT_WRITABLE', message, 403);
    }
    return errorResponse('DRIVE_UPLOAD_FAILED', message, 502);
  }
});
