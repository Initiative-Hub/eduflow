export type OneDriveExportErrorCode =
  | 'DRIVE_DESTINATION_REQUIRED'
  | 'DRIVE_DESTINATION_UNAVAILABLE'
  | 'DRIVE_NOT_CONNECTED'
  | 'DRIVE_UPLOAD_FAILED'
  | 'EXPORT_TOO_LARGE'
  | 'SOURCE_NOT_FOUND';

const STATUS_BY_CODE: Record<OneDriveExportErrorCode, number> = {
  DRIVE_DESTINATION_REQUIRED: 409,
  DRIVE_DESTINATION_UNAVAILABLE: 409,
  DRIVE_NOT_CONNECTED: 409,
  DRIVE_UPLOAD_FAILED: 502,
  EXPORT_TOO_LARGE: 413,
  SOURCE_NOT_FOUND: 404,
};

export class OneDriveExportError extends Error {
  code: OneDriveExportErrorCode;
  details?: unknown;
  status: number;

  constructor(
    code: OneDriveExportErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'OneDriveExportError';
    this.code = code;
    this.details = details;
    this.status = STATUS_BY_CODE[code];
  }
}
