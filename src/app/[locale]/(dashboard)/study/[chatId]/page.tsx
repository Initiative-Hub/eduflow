import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AiChatType } from '@/generated/prisma';
import { auth } from '@/lib/auth';
import {
  type StudyMode,
  type StudyQuizOptions,
  studyModeSchema,
  studyQuizOptionsSchema,
} from '@/lib/validations/study.schema';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';
import { StudyClient } from '../_components/study-client';

interface StudySessionPageProps {
  params: Promise<{ chatId: string }>;
}

function getInitialStudyMode(metadata: unknown): StudyMode {
  if (!metadata || typeof metadata !== 'object') return 'review';
  const value = (metadata as { studyMode?: unknown }).studyMode;
  const parsed = studyModeSchema.safeParse(value);
  return parsed.success ? parsed.data : 'review';
}

function getInitialStudyQuizOptions(
  metadata: unknown
): StudyQuizOptions | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const value = (metadata as { studyQuizOptions?: unknown }).studyQuizOptions;
  const parsed = studyQuizOptionsSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

export default async function StudySessionPage({
  params,
}: StudySessionPageProps) {
  const [session, { chatId }, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    cookies(),
  ]);

  const guestId = cookieStore.get('guest_session')?.value;
  if (!session?.user?.id && !guestId) {
    notFound();
  }

  const studyData = await ChatPersistenceService.getChat({
    chatId,
    userId: session?.user?.id,
    guestId,
    chatType: AiChatType.STUDY_ASSISTANT,
  });

  if (!studyData) {
    notFound();
  }

  return (
    <StudyClient
      chatId={chatId}
      initialMode={getInitialStudyMode(studyData?.metadata)}
      initialQuizOptions={getInitialStudyQuizOptions(studyData?.metadata)}
      initialMessages={studyData?.messages ?? []}
      isAuthenticated={!!session?.user}
    />
  );
}
