import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type SessionContext = {
  user: any;
  session: any;
  me: any;
};

export function withAuth(
  allowedRoles: string[],
  handler: (
    req: Request,
    context: SessionContext
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request) => {
    try {
      // Check session
      const sessionData = await auth.api.getSession({
        headers: await headers(),
      });

      if (!sessionData?.user?.id) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      const me = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        include: { role: true },
      });

      if (
        !me ||
        (allowedRoles.length > 0 && !allowedRoles.includes(me.role?.name || ''))
      ) {
        return NextResponse.json(
          { message: 'Forbidden. Insufficient permissions.' },
          { status: 403 }
        );
      }
      return await handler(req, { ...sessionData, me });
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

export function withValidation(
  schema: any,
  handler: (
    req: Request,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, ...args: any[]) => {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.json();

      schema.parse(body);

      return await handler(req, ...args);
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
    context: SessionContext
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, context: SessionContext) => {
    if (context.me?.role) {
      return NextResponse.json(
        { message: 'Your role is already defined and cannot be changed.' },
        { status: 400 }
      );
    }
    return await handler(req, context);
  };
}
