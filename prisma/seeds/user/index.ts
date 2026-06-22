import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { seededUsers } from './data';
import type { SeededUsers, SeedUsersInput } from './types';

export async function seedUsers({
  prisma,
  platformRoles,
}: SeedUsersInput): Promise<SeededUsers> {
  const entries = await Promise.all(
    Object.entries(seededUsers).map(async ([key, userData]) => {
      const userId = randomUUID();
      const hashedPassword = await hashPassword(userData.password);
      const platformRole = platformRoles[userData.platformRole];

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          roleId: platformRole.id,
          emailVerified: true,
        },
        create: {
          id: userId,
          email: userData.email,
          name: userData.name,
          roleId: platformRole.id,
          emailVerified: true,
          accounts: {
            create: [
              {
                id: randomUUID(),
                accountId: userId,
                providerId: 'credential',
                password: hashedPassword,
              },
            ],
          },
        },
      });

      return [key, user];
    })
  );

  return Object.fromEntries(entries);
}
