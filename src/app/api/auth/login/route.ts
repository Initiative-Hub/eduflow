/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Sign in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               callbackURL:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Signed in
 *       400:
 *         description: Invalid payload
 */
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = loginSchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  return auth.api.signInEmail({
    body: parsedBody.data,
    headers: await headers(),
    asResponse: true,
  });
}
