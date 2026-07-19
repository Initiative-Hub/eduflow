import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChatView } from '@/app/[locale]/(dashboard)/(ai)/_components/chat-view';
import { auth } from '@/lib/auth';
import type { ShareableAiChatType } from '@/lib/validations/ai-chat-share.schema';
import { AiChatShareService } from '@/services/AiChatShareService';
import { SharedAiChatHeader } from '../_components/shared-ai-chat-header';

const chatPaths: Record<ShareableAiChatType, string> = {
  CHAT_ASSISTANT: '/chat',
  SOCRATIC_TUTOR: '/socratic',
  WRITING_ASSISTANT: '/writing',
  STUDY_ASSISTANT: '/study',
};

interface SharedAiChatPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: SharedAiChatPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const sharedChat = await AiChatShareService.getPublicShare(shareId);

  return {
    title: sharedChat?.title ?? 'Shared AI Chat',
  };
}

export default async function SharedAiChatPage({
  params,
}: SharedAiChatPageProps) {
  const [{ shareId }, t, sessionData] = await Promise.all([
    params,
    getTranslations('SharedAiChat'),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const sharedChat = await AiChatShareService.getPublicShare(shareId);

  if (!sharedChat) {
    notFound();
  }

  const isOwner =
    sharedChat.ownerUserId === sessionData?.user?.id &&
    Boolean(sharedChat.ownerUserId);

  const chatPath = chatPaths[sharedChat.chatType];
  const ctaHref =
    isOwner && sharedChat.sourceChatId
      ? `${chatPath}/${sharedChat.sourceChatId}`
      : sharedChat.chatType === 'CHAT_ASSISTANT'
        ? '/'
        : chatPath;

  return (
    <main className="min-h-screen bg-background px-3 py-6 text-foreground sm:px-5 sm:py-8 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <SharedAiChatHeader
          ctaHref={ctaHref}
          isOwner={isOwner}
          t={t}
          title={sharedChat.title}
        />

        <ChatView
          containerClassName="max-w-6xl"
          messages={sharedChat.messages}
          isStreaming={false}
          showInteractiveContentSaveToInventory={false}
        />
      </div>
    </main>
  );
}
