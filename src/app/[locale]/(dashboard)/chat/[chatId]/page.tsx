import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CacheService } from '@/services/CacheService';
import type { ChatCacheData } from '@/utils/chat-session';
import { AIClient } from '../../_components/ai-client';

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const [session, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!guestId) {
    notFound();
  }

  const chatData = await CacheService.getCache<
    Partial<ChatCacheData> & Pick<ChatCacheData, 'guestId' | 'title'>
  >(chatId);

  if (!chatData || chatData.guestId !== guestId) {
    notFound();
  }

  return (
    <AIClient
      userName={session?.user?.name}
      chatId={chatId}
      initialMessages={chatData.messages ?? []}
    />
  );
}
