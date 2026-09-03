import type { GoogleDriveExportSource } from '@/lib/validations/google-drive-export.schema';
import { CloudDriveExportArtifactService } from '@/services/cloud-drive/CloudDriveExportArtifactService';
import type { GoogleDriveExportArtifact } from './GoogleDriveExportService';

export class GoogleDriveExportArtifactService {
  static async resolve(options: {
    source: GoogleDriveExportSource;
    userId: string;
  }): Promise<GoogleDriveExportArtifact> {
    return CloudDriveExportArtifactService.resolve(options);
  }
}
