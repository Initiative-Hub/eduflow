import { render } from '@react-email/components';
import nodemailer from 'nodemailer';
import { createElement } from 'react';
import { DEV_MODE } from '@/constants/common';
import { EduFlowPasswordChangedEmail } from '@/templates/emails/eduflow-password-changed';
import { EduFlowResetPasswordEmail } from '@/templates/emails/eduflow-reset-password';
import { EduFlowVerifyEmail } from '@/templates/emails/eduflow-verify-email';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.EMAIL_SERVER_PORT || '1025', 10), // Default Mailpit port
  auth:
    process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
      ? {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        }
      : undefined,
  secure: !DEV_MODE, // Use secure connection in production
});

const from = process.env.EMAIL_FROM || '"EduFlow" <test@localhost.com>';

export const emailService = {
  sendPasswordReset: async (
    user: { name: string; email: string },
    url: string,
    expiration: number
  ) => {
    try {
      const html = await render(
        createElement(EduFlowResetPasswordEmail, {
          expirationMinutes: Math.floor(expiration / 60),
          resetPasswordUrl: url,
          userName: user.name,
        })
      );

      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Reset your password',
        html,
      });
      if (DEV_MODE) {
        console.log(`Password reset link sent to Mailpit for ${user.email}`);
      }
    } catch (error) {
      console.error('Failed to send reset link:', error);
      throw error;
    }
  },

  sendVerificationOtp: async (email: string, otp: string) => {
    try {
      const html = await render(createElement(EduFlowVerifyEmail, { otp }));

      await transporter.sendMail({
        from,
        to: email,
        subject: 'Your Verification Code',
        html,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`Verification OTP [${otp}] sent to Mailpit for ${email}`);
      }
    } catch (error) {
      console.error('Failed to send verification OTP:', error);
      throw error;
    }
  },

  sendPasswordChangedNotification: async (user: {
    name: string;
    email: string;
  }) => {
    try {
      const html = await render(
        createElement(EduFlowPasswordChangedEmail, {
          userName: user.name,
        })
      );

      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Your password has been changed',
        html,
      });

      if (DEV_MODE) {
        console.log(`Password change notification sent to ${user.email}`);
      }
    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }
  },
};
