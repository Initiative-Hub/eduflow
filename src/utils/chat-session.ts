import type { UIMessage } from 'ai';
import { getMessagePreview } from '@/utils/chat-message';

interface BuildNewChatDataInput {
  guestId: string;
  firstMessage: string;
}

export interface ChatCacheData {
  guestId: string;
  title: string;
  messageCount: number;
  messages: UIMessage[];
}

export const buildNewChatData = ({
  guestId,
  firstMessage,
}: BuildNewChatDataInput) => {
  const title = getMessagePreview(firstMessage) || 'New Chat';

  return {
    guestId,
    title,
    messageCount: 0,
    messages: [],
  };
};
