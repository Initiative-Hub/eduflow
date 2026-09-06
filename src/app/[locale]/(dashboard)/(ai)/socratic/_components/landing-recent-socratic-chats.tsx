'use client';

import { GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingRecentChatList } from '../../_components/landing-recent-chat-list';
import { socraticService } from '../socratic.service';

const RECENT_SOCRATIC_SESSION_LIMIT = 3;

export function LandingRecentSocraticChats() {
  const t = useTranslations('SocraticPage.recentSessions');
  const sidebarT = useTranslations('SocraticPage.sidebar');

  return (
    <LandingRecentChatList
      description={t('description')}
      errorLabel={t('error')}
      getMessageCountLabel={(count) => sidebarT('messageCount', { count })}
      getOpenChatLabel={(title) => t('openChat', { title })}
      getUpdatedLabel={(date) => t('updated', { date })}
      hrefForChat={(chat) => `/socratic/${chat.id}`}
      icon={GraduationCap}
      limit={RECENT_SOCRATIC_SESSION_LIMIT}
      listChats={socraticService.listChats}
      queryKey={['recent-socratic-chats']}
      title={t('title')}
      untitledLabel={sidebarT('untitled')}
    />
  );
}
