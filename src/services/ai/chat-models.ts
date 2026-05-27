export const CHAT_MODEL_IDS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3-flash-lite',
  'gemini-3.5-flash',
] as const;

export type ChatModel = (typeof CHAT_MODEL_IDS)[number];

export const DEFAULT_CHAT_MODEL: ChatModel = 'gemini-3-flash-preview';

export const CHAT_MODEL_OPTIONS: ReadonlyArray<{
  id: ChatModel;
  label: string;
}> = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-3-flash-lite', label: 'Gemini 3 Flash Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
];
