import type { UIMessage } from 'ai';

export interface SocraticSuggestionsData {
  items: string[];
}

const MAX_SOCRATIC_SUGGESTIONS = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function normalizeSocraticSuggestionItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item !== 'string') continue;

    const text = item.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;

    normalized.push(text);
    seen.add(key);

    if (normalized.length === MAX_SOCRATIC_SUGGESTIONS) break;
  }

  return normalized;
}

export function getSocraticSuggestionItems(message: UIMessage): string[] {
  return message.parts.flatMap((part) => {
    if (part.type !== 'data-suggestions') return [];
    if (!isRecord(part.data)) return [];

    return normalizeSocraticSuggestionItems(part.data.items);
  });
}
