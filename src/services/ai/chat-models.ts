export const CHAT_MODEL_IDS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash',
  'gemini-3.1-pro',
] as const;

export type ChatModel = (typeof CHAT_MODEL_IDS)[number];

export const DEFAULT_CHAT_MODEL: ChatModel = 'gemini-2.5-flash';

export const CHAT_MODEL_OPTIONS: ReadonlyArray<{
  id: ChatModel;
  label: string;
}> = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
];
