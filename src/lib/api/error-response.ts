import { NextResponse } from 'next/server';

/**
 * Structured API error response body.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Creates a structured JSON error response for API routes.
 *
 * @param code - Machine-readable error code (e.g., 'QUIZ_NOT_FOUND')
 * @param message - Human-readable error description
 * @param status - HTTP status code
 * @param details - Optional additional context (e.g., Zod validation errors)
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiError> {
  const body: ApiError = { code, message };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}
