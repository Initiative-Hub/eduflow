import * as z from 'zod';
import {
  cloudDriveExportRequestSchema,
  cloudDriveExportSourceSchema,
  type CloudDriveExportSource,
} from './cloud-drive-export.schema';

export const googleDriveDestinationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('my_drive') }).strict(),
  z
    .object({
      kind: z.literal('folder'),
      folderId: z.string().trim().min(1).max(200),
    })
    .strict(),
]);

export const googleDriveExportSourceSchema = cloudDriveExportSourceSchema;
export const googleDriveExportRequestSchema = cloudDriveExportRequestSchema;

export type GoogleDriveDestinationInput = z.infer<
  typeof googleDriveDestinationSchema
>;
export type GoogleDriveExportSource = CloudDriveExportSource;
