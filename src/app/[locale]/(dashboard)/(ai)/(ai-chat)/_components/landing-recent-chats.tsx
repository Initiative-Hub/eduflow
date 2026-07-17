'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingRecentChatList } from '../../_components/landing-recent-chat-list';
import { chatService } from '../chat.service';

const RECENT_CHAT_LIMIT = 3;

export function LandingRecentChats() {
  const t = useTranslations('AIChat.recentChats');
  const sidebarT = useTranslations('AIChat.sidebar');

  return (
    <LandingRecentChatList
      description={t('description')}
      errorLabel={t('error')}
      getMessageCountLabel={(count) => sidebarT('messageCount', { count })}
      getOpenChatLabel={(title) => t('openChat', { title })}
      getUpdatedLabel={(date) => t('updated', { date })}
      hrefForChat={(chat) => `/chat/${chat.id}`}
      icon={MessageSquare}
      limit={RECENT_CHAT_LIMIT}
      listChats={chatService.listChats}
      queryKey={['recent-chats']}
      title={t('title')}
      untitledLabel={sidebarT('untitled')}
    />
  );
}
