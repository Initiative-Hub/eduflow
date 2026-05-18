'use client';

import type { UIMessage } from 'ai';
import { Bot, Loader2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
    <div className="flex h-[calc(100vh-20rem)] w-full flex-col">
      <Conversation>
        <ConversationContent className="custom-scrollbar gap-6 py-4 pr-4">
          {messages.map((message) => {
            const text = getMessageText(message);
            const reasoning = getMessageReasoning(message);
            if (!text && !reasoning) return null;

            const isAnimatingAssistantMessage =
              isStreaming &&
              message.id === messages[messages.length - 1]?.id &&
              message.role === 'assistant';
            const isReasoningStreaming =
              isAnimatingAssistantMessage && Boolean(reasoning);

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
                    className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                      message.role === 'assistant'
                        ? 'border border-border bg-white dark:bg-zinc-900'
                        : 'group-[.is-user]:ml-0 group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-5 group-[.is-user]:py-3 group-[.is-user]:text-primary-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        {reasoning ? (
                          <Reasoning
                            className="mb-3 w-full"
                            isStreaming={isReasoningStreaming}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{reasoning}</ReasoningContent>
                          </Reasoning>
                        ) : null}
                        {text ? (
                          <MessageResponse
                            caret="block"
                            className="text-[15px] leading-relaxed"
                            controls={false}
                            isAnimating={isAnimatingAssistantMessage}
                            mode="streaming"
                            skipHtml
                          >
                            {text}
                          </MessageResponse>
                        ) : null}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                        {text}
                      </p>
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
