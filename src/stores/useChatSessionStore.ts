import type { UIMessage } from 'ai';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ChatSessionState {
  pendingMessage: string | null;
  pendingChatId: string | null;
  optimisticChatId: string | null;
  optimisticMessages: UIMessage[];
  setPendingMessage: (message: string) => void;
  clearPendingMessage: () => void;
  setPendingChatId: (chatId: string | null) => void;
  clearPendingChatId: () => void;
  setOptimisticChatId: (chatId: string | null) => void;
  setOptimisticMessages: (messages: UIMessage[]) => void;
  clearOptimisticMessages: () => void;
}

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      pendingMessage: null,
      pendingChatId: null,
      optimisticChatId: null,
      optimisticMessages: [],
      setPendingMessage: (message) => set({ pendingMessage: message }),
      clearPendingMessage: () => set({ pendingMessage: null }),
      setPendingChatId: (chatId) => set({ pendingChatId: chatId }),
      clearPendingChatId: () => set({ pendingChatId: null }),
      setOptimisticChatId: (chatId) => set({ optimisticChatId: chatId }),
      setOptimisticMessages: (messages) =>
        set({ optimisticMessages: messages }),
      clearOptimisticMessages: () =>
        set({ optimisticMessages: [], optimisticChatId: null }),
    }),
    {
      name: 'chat-session-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        pendingMessage: state.pendingMessage,
        pendingChatId: state.pendingChatId,
        optimisticChatId: state.optimisticChatId,
        optimisticMessages: state.optimisticMessages,
      }),
    }
  )
);
