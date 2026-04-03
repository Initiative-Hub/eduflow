import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const providerSchema = z.enum(['google', 'github', 'microsoft']);
const socialSignInSchema = z.object({
  callbackURL: z.string().optional(),
  errorCallbackURL: z.string().optional(),
});

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const [{ provider }, body] = await Promise.all([
    context.params,
    request.json(),
  ]);

  const parsedProvider = providerSchema.safeParse(provider);
  if (!parsedProvider.success) {
    return NextResponse.json(
      { message: 'Unsupported provider' },
      { status: 400 }
    );
  }

  const parsedBody = socialSignInSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      {
        message: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  return auth.api.signInSocial({
    body: {
      ...parsedBody.data,
      provider: parsedProvider.data,
      disableRedirect: true,
    },
    headers: await headers(),
    asResponse: true,
  });
}
