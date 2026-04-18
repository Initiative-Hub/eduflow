type ChatMessageLike = {
  parts?: Array<{ type?: string; text?: string }>;
  content?: string;
};

export const getMessageText = (message: ChatMessageLike) => {
  if (message.parts?.length) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join('');
  }

  return message.content ?? '';
};

export const getMessagePreview = (message: ChatMessageLike, maxLength = 30) =>
  getMessageText(message).trim().slice(0, maxLength).trimEnd();
