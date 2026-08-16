import { prisma } from '@/lib/prisma';

export class UserAiPreferencesService {
  static async get(userId: string) {
    const preference = await prisma.userAiPreference.findUnique({
      where: { userId },
      select: { customInstructions: true },
    });

    return {
      customInstructions: preference?.customInstructions ?? '',
    };
  }

  static async getCustomInstructions(userId?: string) {
    if (!userId) return null;

    const preference = await prisma.userAiPreference.findUnique({
      where: { userId },
      select: { customInstructions: true },
    });

    return preference?.customInstructions ?? null;
  }

  static async update(userId: string, input: { customInstructions: string }) {
    const customInstructions = input.customInstructions.trim() || null;

    return prisma.userAiPreference.upsert({
      where: { userId },
      create: { userId, customInstructions },
      update: { customInstructions },
      select: { customInstructions: true },
    });
  }
}
