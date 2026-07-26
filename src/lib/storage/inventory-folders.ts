export const INVENTORY_FOLDER_PATHS = {
  aiChat: (chatId: string) => ['ai-chats', chatId],

  assignmentSubmission: (assignmentId: string, submissionId: string) => [
    'assignments',
    assignmentId,
    submissionId,
  ],
};
