'use client';

import { PenLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingRecentChatList } from '../../_components/landing-recent-chat-list';
import { writingService } from '../writing.service';

const RECENT_WRITING_SESSION_LIMIT = 3;

export function LandingRecentWritingChats() {
  const t = useTranslations('WritingPage.recentSessions');
  const sidebarT = useTranslations('WritingPage.sidebar');

  return (
    <LandingRecentChatList
      description={t('description')}
      errorLabel={t('error')}
      getMessageCountLabel={(count) => sidebarT('messageCount', { count })}
      getOpenChatLabel={(title) => t('openChat', { title })}
      getUpdatedLabel={(date) => t('updated', { date })}
      hrefForChat={(chat) => `/writing/${chat.id}`}
      icon={PenLine}
      limit={RECENT_WRITING_SESSION_LIMIT}
      listChats={writingService.listChats}
      queryKey={['recent-writing-chats']}
      title={t('title')}
      untitledLabel={sidebarT('untitled')}
    />
  );
}
