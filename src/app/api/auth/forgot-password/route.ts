import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const forgotPasswordSchema = z.object({
  email: z.email(),
});

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

  return auth.api.requestPasswordResetEmailOTP({
    body: parsedBody.data,
    headers: await headers(),
    asResponse: true,
  });
}
