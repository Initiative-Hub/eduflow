import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession, emailOTP } from 'better-auth/plugins';
import { emailService } from './email-service';
import { prisma } from './prisma';

const RESET_PASSWORD_TOKEN_EXPIRATION = 15 * 60; // 15 minutes in seconds

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  advanced: {
    database: {
      generateId: () => {
        return crypto.randomUUID();
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendPasswordReset(
        user,
        url,
        RESET_PASSWORD_TOKEN_EXPIRATION
      );
    },
    resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_EXPIRATION,
  },

  emailVerification: {
    autoSignInAfterVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
    },
  },

  user: {
    additionalFields: {
      roleId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  plugins: [
    customSession(async ({ user, session }) => {
      const roleId = (user as any).roleId as string | undefined;
      if (!roleId) return { user: { ...user, role: null }, session };

      const roleRow = await prisma.platformRole.findUnique({
        where: { id: roleId },
      });

      return {
        user: {
          ...user,
          role: roleRow?.name || null,
        },
        session,
      };
    }),

    emailOTP({
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'email-verification') {
          await emailService.sendVerificationOtp(email, otp);
        }
      },
    }),
  ],
});
