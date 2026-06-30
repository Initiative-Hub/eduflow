import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { StorageService } from '@/services/StorageService';

const createFolderSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180),
});

/**
 * @swagger
 * /api/v1/storage/folders:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Create a folder
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Parent folder not found
 *       409:
 *         description: Item with this name already exists
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = createFolderSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const folder = await StorageService.createFolder({
        userId: session.user.id,
        parentId: parsed.data.parentId ?? null,
        name: parsed.data.name,
      });

      return NextResponse.json({ data: folder }, { status: 201 });
    } catch (error: any) {
      if (error?.message === 'Parent folder not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }

      if (error?.message === 'An item with this name already exists') {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }

      return NextResponse.json(
        { message: error?.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
