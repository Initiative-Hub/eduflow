'use client';

import type { UIMessage } from 'ai';
import { Bot, Loader2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { getMessageReasoning, getMessageText } from '@/utils/chat-message';

interface ChatViewProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function ChatView({ messages, isStreaming }: ChatViewProps) {
  const t = useTranslations('AIChat');

  return (
    <div className="flex w-full flex-1 flex-col">
      <Conversation>
        <ConversationContent className="custom-scrollbar gap-6 py-4 pr-4">
          {messages.map((message) => {
            const text = getMessageText(message);
            const reasoning = getMessageReasoning(message);
            const attachments = message.parts.flatMap((part, index) =>
              part.type === 'file'
                ? [{ ...part, id: `${message.id}-file-${index}` }]
                : []
            );
            if (!text && !reasoning && attachments.length === 0) return null;

            const isTextStreaming =
              isStreaming &&
              message.id === messages[messages.length - 1]?.id &&
              message.role === 'assistant' &&
              Boolean(text);

            const isReasoningStreaming =
              isStreaming &&
              message.id === messages[messages.length - 1]?.id &&
              message.role === 'assistant' &&
              Boolean(reasoning);

            return (
              <Message
                from={message.role}
                key={message.id}
                className="max-w-full"
              >
                <div
                  className={`flex items-start gap-4 ${message.role === 'assistant' ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${message.role === 'assistant' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="size-5" />
                    ) : (
                      <User className="size-5" />
                    )}
                  </div>
                  <MessageContent
                    className={`max-w-[80%] px-5 py-3 ${
                      message.role === 'user' &&
                      'group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-5 group-[.is-user]:py-3 group-[.is-user]:text-primary-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        {attachments.length > 0 && (
                          <Attachments className="mb-3" variant="inline">
                            {attachments.map((attachment) => (
                              <Attachment data={attachment} key={attachment.id}>
                                <AttachmentPreview />
                                <AttachmentInfo />
                              </Attachment>
                            ))}
                          </Attachments>
                        )}
                        <Reasoning
                          className="mb-3 w-full"
                          defaultOpen={false}
                          isStreaming={isReasoningStreaming}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{reasoning}</ReasoningContent>
                        </Reasoning>
                        <MessageResponse
                          caret="block"
                          className="text-[15px] leading-relaxed"
                          controls={false}
                          isAnimating={isTextStreaming}
                          mode="streaming"
                          skipHtml
                        >
                          {text}
                        </MessageResponse>
                      </>
                    ) : (
                      <>
                        {attachments.length > 0 ? (
                          <Attachments
                            className={text ? 'mb-2' : undefined}
                            variant="inline"
                          >
                            {attachments.map((attachment) => (
                              <Attachment data={attachment} key={attachment.id}>
                                <AttachmentPreview />
                                <AttachmentInfo />
                              </Attachment>
                            ))}
                          </Attachments>
                        ) : null}
                        {text ? (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                            {text}
                          </p>
                        ) : null}
                      </>
                    )}
                  </MessageContent>
                </div>
              </Message>
            );
          })}

          {isStreaming && messages.at(-1)?.role !== 'assistant' && (
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 animate-pulse items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 shadow-sm dark:bg-zinc-900">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="font-medium text-muted-foreground text-sm">
                  {t('thinking')}
                </span>
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-2 shadow-sm" />
      </Conversation>
    </div>
  );
}
