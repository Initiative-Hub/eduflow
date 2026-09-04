export const ONE_DRIVE_AUTHORIZATION_ERROR_CODES = [
  'ONEDRIVE_NOT_CONNECTED',
  'ONEDRIVE_RECONNECT_REQUIRED',
  'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
  'ONEDRIVE_ACCOUNT_MISMATCH',
  'ONEDRIVE_INVALID_PICKER_RESOURCE',
  'ONEDRIVE_PROVIDER_ERROR',
] as const;

export type OneDriveAuthorizationErrorCode =
  (typeof ONE_DRIVE_AUTHORIZATION_ERROR_CODES)[number];

export type OneDriveAuthorizationDiagnostics = {
  correlationId: string | null;
  errorCode: string | null;
  errorNo: string | null;
  subError: string | null;
};

export class OneDriveAuthorizationError extends Error {
  readonly code: OneDriveAuthorizationErrorCode;
  readonly diagnostics: OneDriveAuthorizationDiagnostics | null;

  constructor(
    code: OneDriveAuthorizationErrorCode,
    message: string,
    diagnostics: OneDriveAuthorizationDiagnostics | null = null
  ) {
    super(message);
    this.name = 'OneDriveAuthorizationError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function isOneDriveAuthorizationError(
  error: unknown
): error is OneDriveAuthorizationError {
  return error instanceof OneDriveAuthorizationError;
}
