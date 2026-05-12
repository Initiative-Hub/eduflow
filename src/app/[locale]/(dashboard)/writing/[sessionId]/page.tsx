import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { CacheService } from '@/services/CacheService';
import type { ChatCacheData } from '@/utils/chat-session';
import WritingClient from '../_components/writing-client';

interface WritingSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

const WritingSessionPage = async ({ params }: WritingSessionPageProps) => {
  const [{ sessionId }, cookieStore] = await Promise.all([params, cookies()]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!guestId) {
    notFound();
  }

  const writingData = await CacheService.getCache<
    Partial<ChatCacheData> & Pick<ChatCacheData, 'guestId' | 'title'>
  >(sessionId);

  if (!writingData || writingData.guestId !== guestId) {
    notFound();
  }

  return (
    <WritingClient
      sessionId={sessionId}
      initialMessages={writingData.messages ?? []}
    />
  );
};
export default WritingSessionPage;
