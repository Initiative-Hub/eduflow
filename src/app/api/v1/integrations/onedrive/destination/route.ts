import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { oneDriveDestinationSchema } from '@/lib/validations/onedrive-export.schema';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';

/**
 * @swagger
 * /api/v1/integrations/onedrive/destination:
 *   put:
 *     summary: Set the OneDrive export destination
 *     description: Validates a writable folder and returns the saved destination under data.
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 additionalProperties: false
 *                 required: [kind]
 *                 properties:
 *                   kind:
 *                     type: string
 *                     enum: [my_drive]
 *               - type: object
 *                 additionalProperties: false
 *                 required: [kind, driveId, folderId]
 *                 properties:
 *                   kind:
 *                     type: string
 *                     enum: [folder]
 *                   driveId:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 255
 *                   folderId:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 255
 *     responses:
 *       200:
 *         description: The operation completed successfully.
 *       400:
 *         description: Malformed JSON or invalid request parameters.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user lacks permission or the selected destination is not writable.
 *       409:
 *         description: OneDrive must be connected, or the destination or storage operation has a conflict.
 *       500:
 *         description: The server or provider operation failed.
 *       502:
 *         description: The Microsoft Graph operation failed.
 */
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
