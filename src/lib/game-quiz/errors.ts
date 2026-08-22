export class GameQuizError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'GameQuizError';
  }
}

export const gameQuizError = (
  code: string,
  status: number,
  message: string,
  details?: unknown
) => new GameQuizError(code, status, message, details);

export const isGameQuizError = (error: unknown): error is GameQuizError =>
  error instanceof GameQuizError;
