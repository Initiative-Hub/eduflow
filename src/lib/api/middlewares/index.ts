import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { auth } from '@/lib/auth';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';

export function withAuth(
  handler: (
    req: Request,
    sessionData: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, ...args: any[]) => {
    try {
      const sessionData = await auth.api.getSession({
        headers: await headers(),
      });

      if (!sessionData) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      return await handler(req, sessionData, ...args);
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

export function withRoles(
  allowedRoles: string[],
  handler: (
    req: Request,
    sessionData: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, ...args: any[]) => {
    try {
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
          {
            message:
              'The current user role is not allowed to perform this action.',
          },
          { status: 403 }
        );
      }

      return await handler(req, sessionData, ...args);
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

export function withPermissions(
  allowedPermissions: string[],
  handler: (
    req: Request,
    sessionData: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, ...args: any[]) => {
    try {
      const sessionData = await auth.api.getSession({
        headers: await headers(),
      });

      if (!sessionData) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      if (allowedPermissions.length > 0) {
        const roleId = sessionData.user.roleId;
        if (!roleId) {
          return NextResponse.json(
            {
              message:
                'Forbidden. The current user does not have a role assigned',
            },
            { status: 403 }
          );
        }
        const { permissions } = await getPlatformPermissions(roleId);

        if (
          !allowedPermissions.some((permission) =>
            permissions.includes(permission)
          )
        ) {
          return NextResponse.json(
            { message: 'Forbidden. Insufficient permissions.' },
            { status: 403 }
          );
        }
      }

      return await handler(req, sessionData, ...args);
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
