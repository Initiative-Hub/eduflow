/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset
 *       400:
 *         description: Invalid payload
 */
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { validateResetPasswordToken } from '@/lib/token-validation';

const resetPasswordSchema = z.object({
  password: z.string().min(8),
  token: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = resetPasswordSchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { password, token } = parsedBody.data;

  const validationResult = await validateResetPasswordToken(token);

  if (!validationResult.isValid) {
    return Response.json(
      {
        message: validationResult.message,
      },
      { status: 400 }
    );
  }

  return auth.api.resetPassword({
    body: {
      newPassword: password,
      token,
    },
    asResponse: true,
  });
}
