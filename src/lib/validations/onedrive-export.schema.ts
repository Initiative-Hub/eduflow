import * as z from 'zod';
import {
  cloudDriveExportRequestSchema,
  cloudDriveExportSourceSchema,
  type CloudDriveExportSource,
} from './cloud-drive-export.schema';

export const oneDriveItemRefSchema = z
  .object({
    driveId: z.string().trim().min(1).max(255),
    itemId: z.string().trim().min(1).max(255),
  })
  .strict();

export const oneDriveDestinationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('my_drive') }).strict(),
  z
    .object({
      driveId: z.string().trim().min(1).max(255),
      folderId: z.string().trim().min(1).max(255),
      kind: z.literal('folder'),
    })
    .strict(),
]);

export const oneDrivePickerTokenSchema = z
  .object({
    command: z.string().trim().max(100).optional(),
    resource: z.string().trim().url().max(500).optional(),
  })
  .strict();

export const oneDriveExportSourceSchema = cloudDriveExportSourceSchema;
export const oneDriveExportRequestSchema = cloudDriveExportRequestSchema;

export type OneDriveDestinationInput = z.infer<
  typeof oneDriveDestinationSchema
>;
export type OneDriveExportSource = CloudDriveExportSource;
export type OneDriveItemRef = z.infer<typeof oneDriveItemRefSchema>;
