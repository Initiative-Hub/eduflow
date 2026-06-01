import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  getSocraticSubjectFromMetadata,
  type SocraticUIMessage,
} from '@/app/api/v1/ai/socratic/[chatId]/socratic.constants';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
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
      initialSubject={getSocraticSubjectFromMetadata(socraticData.metadata)}
      initialMessages={socraticData.messages as SocraticUIMessage[]}
      isAuthenticated={Boolean(session?.user?.id)}
    />
  );
}
