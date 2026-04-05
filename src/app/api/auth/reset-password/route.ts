import { z } from 'zod';
import { auth } from '@/lib/auth';

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

  return auth.api.resetPassword({
    body: {
      newPassword: password,
      token,
    },
    asResponse: true,
  });
}
