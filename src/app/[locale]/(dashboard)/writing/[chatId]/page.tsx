import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import {
  type WritingTool,
  writingToolSchema,
} from '@/lib/validations/writing.schema';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import WritingClient from '../_components/writing-client';

interface WritingSessionPageProps {
  params: Promise<{ chatId: string }>;
}

function getInitialWritingTool(metadata: unknown): WritingTool {
  if (!metadata || typeof metadata !== 'object') return 'caption';

  const value = (metadata as { writingTool?: unknown }).writingTool;
  const parsed = writingToolSchema.safeParse(value);

  return parsed.success ? parsed.data : 'caption';
}

export default async function WritingSessionPage({
  params,
}: WritingSessionPageProps) {
  const [sessionData, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  if (
    !sessionData?.user.permissions.includes(PLATFORM_PERMISSION.AI_USE_WRITING)
  ) {
    notFound();
  }

  const guestId = cookieStore.get('guest_session')?.value;
  if (!sessionData && !guestId) {
    notFound();
  }

  const writingData = await ChatPersistenceService.getChatMessagesPage({
    chatId,
    userId: sessionData?.user?.id,
    guestId,
    chatType: AiChatType.WRITING_ASSISTANT,
    limit: 5,
  });

  if (!writingData) {
    notFound();
  }

  return (
    <WritingClient
      chatId={chatId}
      initialTool={getInitialWritingTool(writingData.metadata)}
      initialMessages={writingData.messages ?? []}
      initialMessagesPagination={writingData.pagination}
    />
  );
}
