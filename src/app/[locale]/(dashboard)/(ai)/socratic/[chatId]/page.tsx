import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { SocraticClient } from '../_components/socratic-client';

interface SocraticSessionPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function SocraticSessionPage({
  params,
}: SocraticSessionPageProps) {
  const [sessionData, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!sessionData && !guestId) {
    notFound();
  }

  const socraticData = await ChatPersistenceService.getChatMessagesPage({
    chatId,
    userId: sessionData?.user?.id,
    guestId,
    chatType: AiChatType.SOCRATIC_TUTOR,
    limit: 5,
  });

  if (!socraticData) {
    notFound();
  }

  return (
    <SocraticClient
      chatId={chatId}
      initialMessages={socraticData.messages as SocraticUIMessage[]}
      initialMessagesPagination={socraticData.pagination}
      isAuthenticated={Boolean(sessionData)}
    />
  );
}
