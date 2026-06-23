import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { seedUserDefinition } from './data';
import type { SeededUsers, SeedUserKey, SeedUsersInput } from './types';

export async function seedUsers({
  prisma,
  platformRoles,
}: SeedUsersInput): Promise<SeededUsers> {
  const seeded = {} as SeededUsers;

  for (const [key, userDataList] of Object.entries(seedUserDefinition)) {
    seeded[key as SeedUserKey] = await Promise.all(
      userDataList.map(async (userData) => {
        const userId = randomUUID();
        const hashedPassword = await hashPassword(userData.password);
        const platformRole = platformRoles[userData.platformRole];

        return prisma.user.upsert({
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
      })
    );
  }

  return seeded;
}
