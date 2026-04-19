import type { UIMessage } from '@ai-sdk/react';

export const getMessageText = (message: UIMessage): string => {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
};

export const getMessagePreview = (message: string, maxLength = 30) =>
  message.trim().slice(0, maxLength).trimEnd();
