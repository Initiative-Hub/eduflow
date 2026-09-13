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
    let response: Response;
    if (error instanceof QuizAttemptError) {
      response = errorResponse(error.code, error.message, error.status);
    } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
      response = errorResponse(
        'VALIDATION_ERROR',
        'Invalid attempt request.',
        400
      );
    } else {
      console.error('Quiz attempt request failed:', error);
      response = errorResponse(
        'INTERNAL_ERROR',
        'Unable to process the quiz attempt.',
        500
      );
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
