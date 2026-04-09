import { prisma } from '@/lib/prisma';

export type ResetPasswordTokenValidationResult = {
  isValid: boolean;
  message?: string;
};

export async function validateResetPasswordToken(
  token: string
): Promise<ResetPasswordTokenValidationResult> {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `reset-password:${token}`,
    },
    select: {
      expiresAt: true,
    },
  });

  if (!verification?.expiresAt || verification.expiresAt <= new Date()) {
    return {
      isValid: false,
      message: 'Invalid or expired reset token',
    };
  }

  return {
    isValid: true,
  };
}
