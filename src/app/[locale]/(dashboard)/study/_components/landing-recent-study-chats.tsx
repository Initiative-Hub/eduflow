'use client';

import { GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingRecentChatList } from '../../_components/landing-recent-chat-list';
import { studyService } from '../study.service';

const RECENT_STUDY_SESSION_LIMIT = 3;

export function LandingRecentStudyChats() {
  const t = useTranslations('StudyPage.recentSessions');
  const sidebarT = useTranslations('StudyPage.sidebar');

  return (
    <LandingRecentChatList
      description={t('description')}
      errorLabel={t('error')}
      getMessageCountLabel={(count) => sidebarT('messageCount', { count })}
      getOpenChatLabel={(title) => t('openChat', { title })}
      getUpdatedLabel={(date) => t('updated', { date })}
      hrefForChat={(chat) => `/study/${chat.id}`}
      icon={GraduationCap}
      limit={RECENT_STUDY_SESSION_LIMIT}
      listChats={studyService.listChats}
      queryKey={['recent-study-chats']}
      title={t('title')}
      untitledLabel={sidebarT('untitled')}
    />
  );
}
