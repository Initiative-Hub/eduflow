import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const forgotPasswordSchema = z.object({
  email: z.email(),
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request a password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       400:
 *         description: Invalid payload
 *
 */
export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = forgotPasswordSchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { email } = parsedBody.data;
  const origin = (await headers()).get('origin') || 'http://localhost:3000';

  return auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${origin}/reset-password`,
    },
    headers: await headers(),
    asResponse: true,
  });
}
