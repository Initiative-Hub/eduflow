import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession, emailOTP } from 'better-auth/plugins';
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
    sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
      try {
        await transporter.sendMail({
          from: '"Local Dev" <test@localhost.com>',
          to: user.email,
          subject: 'Reset your password',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Hello ${user.name},</h2>
              <p>Click the link below to reset your password. This link will expire shortly.</p>
              <a href="${url}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Or copy and paste this link: <br/> ${url}
              </p>
            </div>
          `,
        });
        console.log(`Password reset link caught by Mailpit for ${user.email}`);
      } catch (error) {
        console.error('Failed to send reset link:', error);
      }
    },
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

      const roleRow = await prisma.role.findUnique({
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
        if (type !== 'email-verification') {
          return;
        }

        try {
          await transporter.sendMail({
            from: '"Local Dev" <test@localhost.com>',
            to: email,
            subject: 'Your Verification Code',
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>Welcome!</h2>
                <p>Your one-time password is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
                <p>This code is valid for a few minutes.</p>
              </div>
            `,
          });
          console.log(
            `✅ Verification OTP [${otp}] caught by Mailpit for ${email}`
          );
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
