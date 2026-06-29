import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
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
  if (session?.user?.id) {
    const permissions = await getPlatformPermissions(session.user.id);
    if (permissions.withoutPermission(PLATFORM_PERMISSION.AI_USE_CHAT)) {
      notFound();
    }
  }

  const guestId = cookieStore.get('guest_session')?.value;
  if (!session?.user?.id && !guestId) {
    notFound();
  }

  const chatData = await ChatPersistenceService.getChat({
    chatId,
    userId: session?.user?.id,
    guestId,
  });

  if (!chatData) {
    notFound();
  }

  return (
    <AIClient
      userName={session?.user?.name}
      isAuthenticated={Boolean(session?.user?.id)}
      chatId={chatId}
      initialMessages={chatData.messages ?? []}
    />
  );
}
