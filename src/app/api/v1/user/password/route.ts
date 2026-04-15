import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

export const POST = withAuth([], async (req, session) => {
  try {
    const { password } = await req.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    await auth.api.setPassword({
      body: {
        newPassword: password,
      },
      headers: await headers(),
    });

    // Send security notification
    await emailService.sendPasswordChangedNotification({
      name: session.user.name,
      email: session.user.email,
    });

    return NextResponse.json({ message: 'Password set successfully.' });
  } catch (error: any) {
    console.error('Set Password Error:', error);

    // Handle Better Auth specific errors
    if (error.body?.message || error.message) {
      const status = error.statusCode || error.status || 400;
      return NextResponse.json(
        { message: error.body?.message || error.message },
        { status: status >= 400 && status < 600 ? status : 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
