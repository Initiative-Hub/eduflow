import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'localhost',
  port: Number.parseInt(process.env.EMAIL_SERVER_PORT || '1025'),
  auth:
    process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
      ? {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        }
      : undefined,
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
});

const from = process.env.EMAIL_FROM || '"EduFlow" <test@localhost.com>';

export const emailService = {
  sendPasswordReset: async (
    user: { name: string; email: string },
    url: string
  ) => {
    try {
      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Reset your password',
        html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #333;">Hello ${user.name || 'User'},</h2>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire shortly. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">
            Or copy and paste this link in your browser: <br/> ${url}
          </p>
        </div>
      `,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`Password reset link sent to Mailpit for ${user.email}`);
      }
    } catch (error) {
      console.error('Failed to send reset link:', error);
      throw error;
    }
  },

  sendVerificationOtp: async (email: string, otp: string) => {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Your Verification Code',
        html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #333;">Welcome!</h2>
          <p>Thank you for joining us. Please use the following code to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <strong style="font-size: 32px; letter-spacing: 6px; color: #000; background: #f4f4f4; padding: 10px 20px; border-radius: 8px;">${otp}</strong>
          </div>
          <p style="color: #666; font-size: 14px;">This code is valid for a few minutes. For your security, do not share this code with anyone.</p>
        </div>
      `,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`Verification OTP [${otp}] sent to Mailpit for ${email}`);
      }
    } catch (error) {
      console.error('Failed to send verification OTP:', error);
      throw error;
    }
  },
};
