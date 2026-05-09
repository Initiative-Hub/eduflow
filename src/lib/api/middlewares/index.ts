import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { auth, type Session } from '@/lib/auth';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';

export type AuthHandler = (
  req: Request,
  sessionData: Session,
  ...args: any[]
) => Promise<Response>;

const isSessionData = (value: unknown): value is Session =>
  Boolean(
    value && typeof value === 'object' && 'user' in value && 'session' in value
  );

export function withAuth(handler: AuthHandler) {
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

export function withRoles(allowedRoles: string[], handler: AuthHandler) {
  return async (req: Request, ...args: any[]) => {
    try {
      const [maybeSessionData, ...remainingArgs] = args;
      const sessionData = isSessionData(maybeSessionData)
        ? maybeSessionData
        : undefined;
      const handlerArgs = sessionData ? remainingArgs : args;
      let finalSessionData: Session | null = null;

      if (sessionData) {
        finalSessionData = sessionData;
      } else {
        finalSessionData = await auth.api.getSession({
          headers: await headers(),
        });
      }

      if (!finalSessionData) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(finalSessionData.user.role || '')
      ) {
        return NextResponse.json(
          {
            message:
              'The current user role is not allowed to perform this action.',
          },
          { status: 403 }
        );
      }

      return await handler(req, finalSessionData, ...handlerArgs);
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
  handler: AuthHandler
) {
  return async (req: Request, ...args: any[]) => {
    try {
      const [maybeSessionData, ...remainingArgs] = args;
      const sessionData = isSessionData(maybeSessionData)
        ? maybeSessionData
        : undefined;
      const handlerArgs = sessionData ? remainingArgs : args;
      let finalSessionData: Session | null = null;

      if (sessionData) {
        finalSessionData = sessionData;
      } else {
        finalSessionData = await auth.api.getSession({
          headers: await headers(),
        });
      }

      if (!finalSessionData) {
        return NextResponse.json(
          { message: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }

      if (allowedPermissions.length > 0) {
        const { permissions } = await getPlatformPermissions(
          finalSessionData.user.id
        );

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

      return await handler(req, finalSessionData, ...handlerArgs);
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
  ) => Promise<Response> | Response
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
