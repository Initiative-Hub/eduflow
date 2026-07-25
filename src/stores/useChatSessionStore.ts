import type { UIMessage } from 'ai';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SocraticGuidanceDepth } from '@/lib/validations/socratic.schema';
import type { ChatModel } from '@/services/ai/chat-provider.constants';

interface ChatSessionState {
  pendingMessage: UIMessage | null;
  pendingChatId: string | null;
  pendingModel: ChatModel | null;
  pendingSocraticGuidanceDepth: SocraticGuidanceDepth | null;
  setPendingMessage: (message: UIMessage) => void;
  clearPendingMessage: () => void;
  setPendingChatId: (chatId: string | null) => void;
  clearPendingChatId: () => void;
  setPendingModel: (model: ChatModel) => void;
  clearPendingModel: () => void;
  setPendingSocraticGuidanceDepth: (depth: SocraticGuidanceDepth) => void;
  clearPendingSocraticGuidanceDepth: () => void;
}

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      pendingMessage: null,
      pendingChatId: null,
      pendingModel: null,
      pendingSocraticGuidanceDepth: null,
      setPendingMessage: (message) => set({ pendingMessage: message }),
      clearPendingMessage: () => set({ pendingMessage: null }),
      setPendingChatId: (chatId) => set({ pendingChatId: chatId }),
      clearPendingChatId: () => set({ pendingChatId: null }),
      setPendingModel: (model) => set({ pendingModel: model }),
      clearPendingModel: () => set({ pendingModel: null }),
      setPendingSocraticGuidanceDepth: (depth) =>
        set({ pendingSocraticGuidanceDepth: depth }),
      clearPendingSocraticGuidanceDepth: () =>
        set({
          pendingSocraticGuidanceDepth: null,
        }),
    }),
    {
      name: 'chat-session-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingMessage: state.pendingMessage,
        pendingChatId: state.pendingChatId,
        pendingModel: state.pendingModel,
        pendingSocraticGuidanceDepth: state.pendingSocraticGuidanceDepth,
      }),
    }
  )
);
