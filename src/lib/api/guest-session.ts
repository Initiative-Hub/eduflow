import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';

interface ChatOwnerOptions {
  createGuest?: boolean;
}

export async function getChatOwner({
  createGuest = false,
}: ChatOwnerOptions = {}) {
  const [cookieStore, session] = await Promise.all([
    cookies(),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const userId = session?.user?.id;
  let guestId = cookieStore.get('guest_session')?.value;

  if (!(userId || guestId) && createGuest) {
    guestId = crypto.randomUUID();
    cookieStore.set('guest_session', guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
  }

  return {
    session,
    userId,
    guestId: userId ? undefined : guestId,
  };
}
