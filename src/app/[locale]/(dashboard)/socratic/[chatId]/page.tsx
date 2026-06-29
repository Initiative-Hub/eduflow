import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { SocraticClient } from '../_components/socratic-client';

interface SocraticSessionPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function SocraticSessionPage({
  params,
}: SocraticSessionPageProps) {
  const [session, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);
  if (session?.user?.id) {
    const permissions = await getPlatformPermissions(session.user.id);
    if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_SOCRATIC)) {
      notFound();
    }
  }

  const guestId = cookieStore.get('guest_session')?.value;
  if (!session?.user?.id && !guestId) {
    notFound();
  }

  const socraticData = await ChatPersistenceService.getChat({
    chatId,
    userId: session?.user?.id,
    guestId,
    chatType: AiChatType.SOCRATIC_TUTOR,
  });

  if (!socraticData) {
    notFound();
  }

  return (
    <SocraticClient
      chatId={chatId}
      initialMessages={socraticData.messages as SocraticUIMessage[]}
      isAuthenticated={Boolean(session?.user?.id)}
    />
  );
}
