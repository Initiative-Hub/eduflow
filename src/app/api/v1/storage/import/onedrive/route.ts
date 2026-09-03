import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';
import { oneDriveItemRefSchema } from '@/lib/validations/onedrive-export.schema';
import { OneDriveImportService } from '@/services/onedrive/OneDriveImportService';

const importOneDriveSchema = oneDriveItemRefSchema.extend({
  parentId: z.string().uuid().nullable().optional(),
});

export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = importOneDriveSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const imported = await OneDriveImportService.importFile({
        driveId: parsed.data.driveId,
        itemId: parsed.data.itemId,
        parentId: parsed.data.parentId ?? null,
        userId: session.user.id,
      });

      return NextResponse.json({ data: imported }, { status: 201 });
    } catch (error: any) {
      if (error?.message === 'OneDrive is not connected.') {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }

      return buildStorageErrorResponse(error);
    }
  }
);
