import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AIClient } from '../../_components/ai-client';
import { ChatReloadGuard } from './_components/chat-reload-guard';

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { chatId } = await params;

  return (
    <>
      {!session && <ChatReloadGuard />}
      <AIClient userName={session?.user?.name} chatId={chatId} />
    </>
  );
}
