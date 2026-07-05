export const STORAGE_ERROR_CODE = {
  INVALID_MOVE: 'STORAGE_INVALID_MOVE',
  NAME_CONFLICT: 'STORAGE_NAME_CONFLICT',
} as const;

export type StorageErrorCode =
  (typeof STORAGE_ERROR_CODE)[keyof typeof STORAGE_ERROR_CODE];

export type StorageConflictOperation =
  | 'create_folder'
  | 'ensure_folder_path'
  | 'move'
  | 'rename';

export type StorageEntryType = 'file' | 'folder';

export type StorageErrorDetails =
  | {
      attemptedName: string;
      conflictingName: string;
      entryType: StorageEntryType;
      operation: StorageConflictOperation;
      targetParentId: string | null;
    }
  | {
      operation: 'move';
    };

export class StorageError extends Error {
  code: StorageErrorCode;
  details?: StorageErrorDetails;
  status: number;

  constructor(options: {
    code: StorageErrorCode;
    message: string;
    status?: number;
    details?: StorageErrorDetails;
  }) {
    super(options.message);
    this.name = 'StorageError';
    this.code = options.code;
    this.details = options.details;
    this.status = options.status ?? 400;
  }
}

export function createStorageNameConflictError(options: {
  attemptedName: string;
  conflictingName: string;
  entryType: StorageEntryType;
  operation: StorageConflictOperation;
  targetParentId: string | null;
}) {
  const message =
    options.operation === 'move'
      ? 'A file or folder with this name already exists in the destination folder.'
      : 'A file or folder with this name already exists in this folder.';

  return new StorageError({
    code: STORAGE_ERROR_CODE.NAME_CONFLICT,
    details: options,
    message,
    status: 409,
  });
}

export function createStorageInvalidMoveError() {
  return new StorageError({
    code: STORAGE_ERROR_CODE.INVALID_MOVE,
    details: {
      operation: 'move',
    },
    message: 'Cannot move a folder inside itself.',
    status: 409,
  });
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
