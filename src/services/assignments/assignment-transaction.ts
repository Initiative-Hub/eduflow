import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

export async function runSerializableAssignmentTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < SERIALIZABLE_TRANSACTION_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw new Error('Serializable transaction retry limit exceeded');
}
