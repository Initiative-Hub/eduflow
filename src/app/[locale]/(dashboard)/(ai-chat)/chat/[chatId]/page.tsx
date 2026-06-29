import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import { AIClient } from '../../_components/ai-client';

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const [sessionData, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!sessionData && !guestId) {
    notFound();
  }

  const chatData = await ChatPersistenceService.getChat({
    chatId,
    userId: sessionData?.user.id,
    guestId,
  });

  if (!chatData) {
    notFound();
  }

  return (
    <AIClient
      userName={sessionData?.user?.name}
      isAuthenticated={Boolean(sessionData)}
      chatId={chatId}
      initialMessages={chatData.messages ?? []}
    />
  );
}
