export type ForgotPasswordResetResult = {
  success: true;
  email: string;
};

export const forgotPasswordService = {
  resetPassword: async (email: string): Promise<ForgotPasswordResetResult> => {
    return Promise.resolve({
      success: true,
      email,
    });
  },
};
