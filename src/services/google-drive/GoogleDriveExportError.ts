export type GoogleDriveExportErrorCode =
  | 'DRIVE_NOT_CONNECTED'
  | 'DRIVE_DESTINATION_REQUIRED'
  | 'DRIVE_DESTINATION_NOT_WRITABLE'
  | 'SOURCE_NOT_FOUND'
  | 'DRIVE_DESTINATION_UNAVAILABLE'
  | 'EXPORT_TOO_LARGE'
  | 'DRIVE_UPLOAD_FAILED';

const ERROR_STATUS: Record<GoogleDriveExportErrorCode, number> = {
  DRIVE_DESTINATION_NOT_WRITABLE: 403,
  DRIVE_DESTINATION_REQUIRED: 409,
  DRIVE_DESTINATION_UNAVAILABLE: 410,
  DRIVE_NOT_CONNECTED: 409,
  DRIVE_UPLOAD_FAILED: 502,
  EXPORT_TOO_LARGE: 413,
  SOURCE_NOT_FOUND: 404,
};

export class GoogleDriveExportError extends Error {
  readonly code: GoogleDriveExportErrorCode;
  readonly details?: { reason: string };
  readonly status: number;

  constructor(
    code: GoogleDriveExportErrorCode,
    message: string,
    details?: { reason: string }
  ) {
    super(message);
    this.name = 'GoogleDriveExportError';
    this.code = code;
    this.details = details;
    this.status = ERROR_STATUS[code];
  }
}
