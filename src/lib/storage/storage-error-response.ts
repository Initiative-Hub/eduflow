import { NextResponse } from 'next/server';
import { isStorageError } from '@/lib/storage/inventory-errors';

const STORAGE_ERROR_STATUS_BY_MESSAGE: Record<string, number> = {
  'File not found': 404,
  'File not found in this course': 404,
  'Parent folder not found': 404,
  'File size exceeds storage upload limit': 413,
  'Selected OneDrive file is missing a name.': 400,
  'Selected Google Drive file is missing a name.': 400,
  'This OneDrive item cannot be downloaded.': 400,
  'This Google Drive file cannot be downloaded.': 400,
  'This Google Drive file type cannot be imported yet.': 400,
  Unauthorized: 403,
  Forbidden: 403,
};

export function buildStorageErrorResponse(error: unknown) {
  if (isStorageError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        details: error.details,
        message: error.message,
      },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    const status = STORAGE_ERROR_STATUS_BY_MESSAGE[error.message];
    if (status) {
      return NextResponse.json({ message: error.message }, { status });
    }
  }

  return NextResponse.json(
    {
      message: error instanceof Error ? error.message : 'Internal Server Error',
    },
    { status: 500 }
  );
}
