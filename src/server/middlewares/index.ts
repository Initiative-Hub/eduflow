import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { auth } from '@/lib/auth';

export function withAuth(
  allowedRoles: string[],
  handler: (
    req: Request,
    sessionData: Awaited<ReturnType<typeof auth.api.getSession>>
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request) => {
    try {
      // Check session
      const sessionData = await auth.api.getSession({
        headers: await headers(),
      });

      if (!sessionData) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(sessionData.user.role || '')
      ) {
        return NextResponse.json(
          { message: 'Forbidden. Insufficient permissions.' },
          { status: 403 }
        );
      }

      return await handler(req, sessionData);
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

export function withValidation<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  handler: (
    req: Request,
    parsedBody: z.infer<typeof schema>,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, ...args: any[]) => {
    try {
      const body = await req.json();
      const parsedBody = schema.safeParse(body);

      if (!parsedBody.success) {
        throw parsedBody.error;
      }

      return await handler(req, parsedBody.data, ...args);
    } catch (error: any) {
      return NextResponse.json(
        { message: 'Invalid payload', errors: error.errors },
        { status: 400 }
      );
    }
  };
}

export function withNoRole(
  handler: (
    req: Request,
    sessionData: Awaited<ReturnType<typeof auth.api.getSession>>
  ) => Promise<NextResponse> | NextResponse
) {
  return async (
    req: Request,
    sessionData: Awaited<ReturnType<typeof auth.api.getSession>>
  ) => {
    if (!sessionData) {
      return NextResponse.json(
        { message: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    if (sessionData.user.role) {
      return NextResponse.json(
        { message: 'Your role is already defined and cannot be changed.' },
        { status: 400 }
      );
    }

    return await handler(req, sessionData);
  };
}
