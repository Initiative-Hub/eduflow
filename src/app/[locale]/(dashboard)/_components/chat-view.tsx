'use client';

import type { UIMessage } from 'ai';
import { Bot, Loader2, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { Suggestion } from '@/components/ai-elements/suggestion';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';
import {
  buildInlineCitationMarkdown,
  getCitationSources,
} from '@/utils/chat-citations';
import { getMessageReasoning, getMessageText } from '@/utils/chat-message';
import { getChatSuggestionItems } from '@/utils/chat-suggestions';
import { getStudyInteractiveContentParts } from '@/utils/study-interactive-content';
import { getStudyPracticeQuizParts } from '@/utils/study-practice-quiz';
import InteractiveContentPreview from '../study/_components/interactive-content-preview';
import { createChatCitationComponents } from './chat-citations';
import { ChatInputAttachments } from './chat-input-attachments';
import { ChatToolInvocations } from './chat-tools';

interface ChatViewProps {
  chatId?: string;
  canShareInteractiveContent?: boolean;
  messages: UIMessage[];
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isStreaming: boolean;
  loadOlderMessages?: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  suggestionsDisabled?: boolean;
  showInteractiveContentSaveToInventory?: boolean;
}

const Quiz = dynamic(() => import('@/components/quiz').then((mod) => mod.Quiz));

export function ChatView({
  chatId,
  canShareInteractiveContent = false,
  messages,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  isStreaming,
  loadOlderMessages,
  onSuggestionSelect,
  scrollContainerRef,
  suggestionsDisabled = false,
  showInteractiveContentSaveToInventory = true,
}: ChatViewProps) {
  const t = useTranslations('AIChat');
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const shouldRestoreScrollRef = useRef(false);
  const hasInitialScrollRef = useRef(false);
  const bottomMarkerRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  const [isAtBottom, setIsAtBottom] = useState(true);

  // Monitor scroll position to see if user is scrolled to bottom
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root) return;

    const handleScroll = () => {
      const threshold = 50; // buffer in px
      const isAtBottom =
        root.scrollHeight - root.scrollTop - root.clientHeight <= threshold;
      setIsAtBottom(isAtBottom);
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      root.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollContainerRef?.current;
    if (!sentinel || !root || !loadOlderMessages || !hasOlderMessages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isLoadingOlderMessages) {
          previousScrollHeightRef.current = root.scrollHeight;
          shouldRestoreScrollRef.current = true;
          loadOlderMessages();
        }
      },
      {
        root,
        rootMargin: '120px 0px 0px 0px',
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasOlderMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
    scrollContainerRef,
  ]);

  useEffect(() => {
    const root = scrollContainerRef?.current;
    const previousScrollHeight = previousScrollHeightRef.current;
    if (
      !root ||
      isLoadingOlderMessages ||
      !shouldRestoreScrollRef.current ||
      previousScrollHeight === null
    ) {
      return;
    }

    root.scrollTop += root.scrollHeight - previousScrollHeight;
    previousScrollHeightRef.current = null;
    shouldRestoreScrollRef.current = false;
  }, [isLoadingOlderMessages, scrollContainerRef]);

  // Initial scroll to the last user message on mount or initial data load
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root || hasInitialScrollRef.current || messages.length === 0) return;

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMessage) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`message-${lastUserMessage.id}`);
        if (el) {
          el.scrollIntoView({
            behavior: 'instant',
            block: 'nearest',
            inline: 'nearest',
          });
        }
      });
    }
    hasInitialScrollRef.current = true;
  }, [messages, scrollContainerRef]);

  // Scroll to bottom when user sends a new message
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root) return;

    const prevLength = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (messages.length > prevLength) {
      const lastMessage = messages[messages.length - 1];
      const prevLastMessage = prevLength > 0 ? messages[prevLength - 1] : null;

      if (
        lastMessage &&
        (!prevLastMessage || lastMessage.id !== prevLastMessage.id) &&
        lastMessage.role === 'user'
      ) {
        setIsAtBottom(true);
        bottomMarkerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [messages, scrollContainerRef]);

  // Continuous scroll during streaming (only if user is already at the bottom)
  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root || !isAtBottom || !isStreaming || messages.length === 0) return;

    bottomMarkerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [isAtBottom, isStreaming, messages, scrollContainerRef]);

  return (
    <div className="mx-auto max-w-4xl">
      <Conversation>
        <ConversationContent className="gap-6 py-8">
          {hasOlderMessages || isLoadingOlderMessages ? (
            <div
              ref={topSentinelRef}
              className="flex min-h-8 items-center justify-center"
            >
              {isLoadingOlderMessages ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          ) : null}
          {messages.map((message) => {
            const text = getMessageText(message);
            const reasoning = getMessageReasoning(message);
            const citationSources =
              message.role === 'assistant'
                ? getCitationSources(message.parts)
                : [];
            const responseText =
              message.role === 'assistant'
                ? buildInlineCitationMarkdown(text, citationSources)
                : text;
            const suggestions =
              message.role === 'assistant'
                ? getChatSuggestionItems(message)
                : [];
            const practiceQuizzes =
              message.role === 'assistant'
                ? getStudyPracticeQuizParts(message)
                : [];
            const interactiveContents =
              message.role === 'assistant'
                ? getStudyInteractiveContentParts(message)
                : [];
            const attachments = message.parts.flatMap((part, index) =>
              part.type === 'file'
                ? [{ ...part, id: `${message.id}-file-${index}` }]
                : []
            );
            const lessonReferences = message.parts.flatMap((part) =>
              part.type === 'data-lesson-reference' &&
              typeof (part as ChatLessonReferenceUIPart).data?.lessonId ===
                'string'
                ? [part as ChatLessonReferenceUIPart]
                : []
            );

            if (
              !text &&
              !reasoning &&
              attachments.length === 0 &&
              lessonReferences.length === 0 &&
              practiceQuizzes.length === 0 &&
              interactiveContents.length === 0
            )
              return null;

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
                className="max-w-full"
                from={message.role}
                id={`message-${message.id}`}
                key={message.id}
              >
                <div className="flex flex-col gap-3">
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
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-2 ${
                        message.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {message.role === 'user' &&
                        (attachments.length > 0 ||
                          lessonReferences.length > 0) && (
                          <ChatInputAttachments
                            files={[
                              ...attachments.map((attachment) => ({
                                filename: attachment.filename ?? attachment.id,
                                id: attachment.id,
                                mediaType: attachment.mediaType,
                                previewUrl: attachment.url,
                              })),
                              ...lessonReferences.map((lesson) => ({
                                filename: lesson.data.lessonTitle,
                                id: lesson.data.lessonId,
                                kind: 'lesson' as const,
                                lessonPart: lesson,
                                mediaType:
                                  'application/x-eduflow-lesson-reference',
                                previewUrl: `lesson:${lesson.data.lessonId}`,
                              })),
                            ]}
                          />
                        )}
                      <MessageContent
                        className={`max-w-[80%] px-5 py-3 ${
                          message.role === 'user' &&
                          'group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-5 group-[.is-user]:py-3 group-[.is-user]:text-primary-foreground'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <>
                            <Reasoning
                              className="mb-3 w-full"
                              defaultOpen={false}
                              isStreaming={isReasoningStreaming}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{reasoning}</ReasoningContent>
                            </Reasoning>
                            <ChatToolInvocations parts={message.parts} />
                            <MessageResponse
                              caret="block"
                              className="text-[15px] leading-relaxed"
                              controls={true}
                              isAnimating={isTextStreaming}
                              mode="streaming"
                              skipHtml={false}
                              components={createChatCitationComponents(
                                citationSources
                              )}
                            >
                              {responseText}
                            </MessageResponse>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                            {text}
                          </p>
                        )}
                      </MessageContent>
                      {message.role === 'assistant' &&
                        interactiveContents.map((content, index) => (
                          <div
                            key={`${message.id}-interactive-content-${index}`}
                            className="w-full max-w-3xl"
                          >
                            <InteractiveContentPreview
                              title={content.title}
                              description={content.description}
                              html={content.html}
                              share={
                                chatId && canShareInteractiveContent
                                  ? {
                                      chatId,
                                      messageId: message.id,
                                      contentIndex: index,
                                    }
                                  : undefined
                              }
                              showSaveToInventory={
                                showInteractiveContentSaveToInventory
                              }
                            />
                          </div>
                        ))}
                      {message.role === 'assistant' &&
                        practiceQuizzes.map((practiceQuiz, index) => (
                          <div
                            key={`${message.id}-practice-quiz-${index}`}
                            className="w-full max-w-3xl"
                          >
                            <Quiz
                              quiz={practiceQuiz.quiz}
                              quizWithAnswers={practiceQuiz.quiz}
                              deliveryMode={practiceQuiz.deliveryMode}
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  {suggestions.length > 0 && onSuggestionSelect ? (
                    <div className="ml-14 max-w-[calc(100%-3.5rem)] sm:max-w-3xl">
                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                        {t('suggestions.followUp')}
                      </p>
                      <ul
                        aria-label={t('suggestions.followUp')}
                        className="flex w-full flex-col gap-2"
                      >
                        {suggestions.map((suggestion) => (
                          <li
                            className="flex items-start gap-2"
                            key={suggestion}
                          >
                            <Suggestion
                              className="wrap-anywhere h-auto min-h-10 w-full max-w-full flex-1 items-start justify-start whitespace-normal rounded-xl border-border/80 bg-background/80 px-3.5 py-2.5 text-left text-foreground text-sm leading-relaxed shadow-none transition-colors hover:bg-muted/90"
                              disabled={suggestionsDisabled}
                              onClick={onSuggestionSelect}
                              suggestion={suggestion}
                            >
                              <span className="block text-left">
                                {suggestion}
                              </span>
                            </Suggestion>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
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

          {/* Bottom marker for scrolling to the latest message */}
          <div ref={bottomMarkerRef} />
        </ConversationContent>
        <ConversationScrollButton className="bottom-2 shadow-sm" />
      </Conversation>
    </div>
  );
}
