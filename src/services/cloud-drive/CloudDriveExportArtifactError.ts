export class CloudDriveExportArtifactError extends Error {
  readonly code = 'SOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(
    message: string,
    readonly details?: { reason: string }
  ) {
    super(message);
    this.name = 'CloudDriveExportArtifactError';
  }
}
