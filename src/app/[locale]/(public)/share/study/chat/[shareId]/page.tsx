import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChatView } from '@/app/[locale]/(dashboard)/_components/chat-view';
import { auth } from '@/lib/auth';
import { StudyShareService } from '@/services/StudyShareService';
import { SharedStudyChatHeader } from '../_components/shared-study-chat-header';

interface SharedStudyChatPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: SharedStudyChatPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const chat = await StudyShareService.getPublicStudyChat(shareId);

  return {
    title: chat ? `${chat.title}` : `Shared study chat`,
  };
}

export default async function SharedStudyChatPage({
  params,
}: SharedStudyChatPageProps) {
  const [{ shareId }, t, sessionData] = await Promise.all([
    params,
    getTranslations('StudyPage.sharedChat'),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const sharedChat = await StudyShareService.getPublicStudyChat(shareId);

  if (!sharedChat) {
    notFound();
  }

  const isOwner =
    Boolean(sharedChat.ownerUserId) &&
    sharedChat.ownerUserId === sessionData?.user?.id;

  return (
    <main className="min-h-screen bg-background px-3 py-6 text-foreground sm:px-5 sm:py-8 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <SharedStudyChatHeader
          title={sharedChat.title}
          ctaHref={
            isOwner && sharedChat.sourceChatId
              ? `/study/${sharedChat.sourceChatId}`
              : '/study'
          }
          isOwner={isOwner}
          t={t}
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
