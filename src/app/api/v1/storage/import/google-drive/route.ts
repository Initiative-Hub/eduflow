import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';
import { GoogleDriveImportService } from '@/services/google-drive/GoogleDriveImportService';

const importGoogleDriveSchema = z.object({
  fileId: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
});

export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = importGoogleDriveSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const imported = await GoogleDriveImportService.importFile({
        fileId: parsed.data.fileId,
        parentId: parsed.data.parentId ?? null,
        userId: session.user.id,
      });

      return NextResponse.json({ data: imported }, { status: 201 });
    } catch (error: any) {
      if (error?.message === 'Google Drive is not connected.') {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }

      return buildStorageErrorResponse(error);
    }
  }
);
