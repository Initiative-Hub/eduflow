import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import {
  type WritingTool,
  writingToolSchema,
} from '@/lib/validations/writing.schema';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import WritingClient from '../_components/writing-client';

interface WritingSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

function getInitialWritingTool(metadata: unknown): WritingTool {
  if (!metadata || typeof metadata !== 'object') return 'caption';

  const value = (metadata as { writingTool?: unknown }).writingTool;
  const parsed = writingToolSchema.safeParse(value);

  return parsed.success ? parsed.data : 'caption';
}

const WritingSessionPage = async ({ params }: WritingSessionPageProps) => {
  const [session, { sessionId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!session?.user?.id && !guestId) {
    notFound();
  }

  const writingData = await ChatPersistenceService.getChat({
    chatId: sessionId,
    userId: session?.user?.id,
    guestId,
    chatType: AiChatType.WRITING_ASSISTANT,
  });

  if (!writingData) {
    notFound();
  }

  return (
    <WritingClient
      sessionId={sessionId}
      initialTool={getInitialWritingTool(writingData.metadata)}
      initialMessages={writingData.messages ?? []}
    />
  );
};
export default WritingSessionPage;
