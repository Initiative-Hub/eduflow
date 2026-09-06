import type { PrismaClient } from '../../../src/generated/prisma';

export type DemoUserKey = 'teacher' | 'student';

export type DemoChat = {
  id: string;
  userKey: DemoUserKey;
  title: string;
  type: 'CHAT_ASSISTANT' | 'STUDY_ASSISTANT';
  provider: string;
  model: string;
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT';
    parts: Array<{ type: 'text'; text: string }>;
  }>;
};

export type SeedDemoChatsInput = {
  prisma: PrismaClient;
  teacherUserId: string;
  studentUserId: string;
};
