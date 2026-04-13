/**
 * @swagger
 * /api/auth/otp/verify:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify email OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid payload
 */
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const verifyOtpSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = verifyOtpSchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  return auth.api.verifyEmailOTP({
    body: parsedBody.data,
    headers: await headers(),
    asResponse: true,
  });
}
