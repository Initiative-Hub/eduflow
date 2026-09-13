import { NextResponse } from 'next/server';
import * as z from 'zod';
import { QuizAttemptError } from '@/services/quiz-attempt-data';
import { errorResponse } from './error-response';

export async function attemptResponse(action: () => Promise<unknown>) {
  try {
    return NextResponse.json(await action(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof QuizAttemptError)
      return errorResponse(error.code, error.message, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return errorResponse('VALIDATION_ERROR', 'Invalid attempt request.', 400);
    console.error('Quiz attempt request failed:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Unable to process the quiz attempt.',
      500
    );
  }
}
