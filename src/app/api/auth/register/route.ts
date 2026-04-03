import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsedBody = registerSchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  return auth.api.signUpEmail({
    body: parsedBody.data,
    headers: await headers(),
    asResponse: true,
  });
}
