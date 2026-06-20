import { demoChats } from './data';
import type { SeedDemoChatsInput } from './types';

export async function seedDemoChats({
  prisma,
  teacherUserId,
  studentUserId,
}: SeedDemoChatsInput) {
  const demoUsers = { teacher: teacherUserId, student: studentUserId };

  for (const chatData of demoChats) {
    const chatUserId = demoUsers[chatData.userKey];

    await prisma.aiChat.upsert({
      where: { id: chatData.id },
      update: {
        userId: chatUserId,
        title: chatData.title,
        type: chatData.type,
        status: 'ACTIVE',
        provider: chatData.provider,
        model: chatData.model,
        deletedAt: null,
      },
      create: {
        id: chatData.id,
        userId: chatUserId,
        title: chatData.title,
        type: chatData.type,
        provider: chatData.provider,
        model: chatData.model,
      },
    });

    for (const [messageIndex, message] of chatData.messages.entries()) {
      await prisma.aiChatMessage.upsert({
        where: { id: message.id },
        update: {
          chatId: chatData.id,
          userId: message.role === 'USER' ? chatUserId : null,
          role: message.role,
          parts: message.parts,
          provider: chatData.provider,
          model: chatData.model,
        },
        create: {
          id: message.id,
          chatId: chatData.id,
          userId: message.role === 'USER' ? chatUserId : null,
          role: message.role,
          parts: message.parts,
          provider: chatData.provider,
          model: chatData.model,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, messageIndex)),
        },
      });
    }
  }

  return demoChats.length;
}
