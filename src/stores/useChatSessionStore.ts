import type { UIMessage } from 'ai';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
  type SocraticGuidanceDepth,
} from '@/lib/validations/socratic.schema';
import type { ChatModel } from '@/services/ai/chat-models';
import type { ChatFileUIPart } from '@/types/chat-attachments';

interface ChatSessionState {
  pendingMessage: string | null;
  pendingFiles: ChatFileUIPart[];
  pendingChatId: string | null;
  pendingModel: ChatModel | null;
  pendingSocraticGuidanceDepth: SocraticGuidanceDepth;
  optimisticChatId: string | null;
  optimisticMessages: UIMessage[];
  setPendingMessage: (message: string) => void;
  setPendingFiles: (files: ChatFileUIPart[]) => void;
  clearPendingFiles: () => void;
  clearPendingMessage: () => void;
  setPendingChatId: (chatId: string | null) => void;
  clearPendingChatId: () => void;
  setPendingModel: (model: ChatModel | null) => void;
  clearPendingModel: () => void;
  setPendingSocraticGuidanceDepth: (depth: SocraticGuidanceDepth) => void;
  clearPendingSocraticGuidanceDepth: () => void;
  setOptimisticChatId: (chatId: string | null) => void;
  setOptimisticMessages: (messages: UIMessage[]) => void;
  clearOptimisticMessages: () => void;
}

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      pendingMessage: null,
      pendingFiles: [],
      pendingChatId: null,
      pendingModel: null,
      pendingSocraticGuidanceDepth: DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
      optimisticChatId: null,
      optimisticMessages: [],
      setPendingMessage: (message) => set({ pendingMessage: message }),
      clearPendingMessage: () => set({ pendingMessage: null }),
      setPendingFiles: (files) => set({ pendingFiles: files }),
      clearPendingFiles: () => set({ pendingFiles: [] }),
      setPendingChatId: (chatId) => set({ pendingChatId: chatId }),
      clearPendingChatId: () => set({ pendingChatId: null }),
      setPendingModel: (model) => set({ pendingModel: model }),
      clearPendingModel: () => set({ pendingModel: null }),
      setPendingSocraticGuidanceDepth: (depth) =>
        set({ pendingSocraticGuidanceDepth: depth }),
      clearPendingSocraticGuidanceDepth: () =>
        set({
          pendingSocraticGuidanceDepth: DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
        }),
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
        pendingFiles: state.pendingFiles,
        pendingChatId: state.pendingChatId,
        pendingModel: state.pendingModel,
        pendingSocraticGuidanceDepth: state.pendingSocraticGuidanceDepth,
        optimisticChatId: state.optimisticChatId,
        optimisticMessages: state.optimisticMessages,
      }),
    }
  )
);
