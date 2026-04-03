import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
  ignoreTLS: true,
});

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
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const isEmailVerification = type === 'email-verification';
        const isForgotPassword = type === 'forget-password';

        if (!isEmailVerification && !isForgotPassword) {
          return;
        }

        try {
          await transporter.sendMail({
            from: '"Local Dev" <test@localhost.com>',
            to: email,
            subject: isEmailVerification
              ? 'Your Verification Code'
              : 'Your Password Reset Code',
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>${isEmailVerification ? 'Welcome!' : 'Reset your password'}</h2>
                <p>Your one-time password is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
                <p>This code is valid for a few minutes.</p>
              </div>
            `,
          });
          console.log(`OTP [${otp}] caught by Mailpit for ${email}`);
        } catch (error) {
          console.error('Failed to send local OTP:', error);
        }
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const defaultRole = await prisma.role.findUnique({
            where: { name: 'USER' },
            select: { id: true },
          });

          return {
            data: {
              ...user,
              roleId: defaultRole?.id || null,
            },
          };
        },
      },
    },
  },
});
