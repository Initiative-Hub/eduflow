import { getMessagePreview } from '@/utils/chat-message';

interface BuildNewChatDataInput {
  guestId: string;
  firstMessage: string;
}

export const buildNewChatData = ({
  guestId,
  firstMessage,
}: BuildNewChatDataInput) => {
  const title = getMessagePreview({ content: firstMessage }) || 'New Chat';

  return {
    guestId,
    title,
    messageCount: 0,
  };
};
