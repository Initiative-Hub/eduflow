import type { ToolSet, UIMessage } from 'ai'; // Add CoreTool here
import type { AICourseGeneration } from '@/lib/validations/course.schema';

export type ChatProvider = 'ai-gateway' | 'google' | 'openrouter';

export type StreamChatInput = {
  messages: UIMessage[];
  provider?: ChatProvider;
  model?: string;
  apiKey?: string;
};

export type StreamChatInternalOptions = {
  prompt?: string;
  tools?: ToolSet;
  maxSteps?: number;
};

export type StreamCourseInput = {
  userId: string;
  fileId?: string;
  file?: File;
  context?: string;
  model?: string;
  apiKey?: string;
  onEnd?: (event: { object: AICourseGeneration }) => PromiseLike<void> | void;
};

export type AIQuizInput = {
  quizType: string;
  questionNumbers: string;
  topic?: string;
  context?: string;
  content?: string;
  apiKey?: string;
  model?: string;
};
