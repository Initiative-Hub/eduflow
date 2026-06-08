export type EnglishTextToken =
  | { type: 'word'; text: string; lookup: string }
  | { type: 'text'; text: string };

const ENGLISH_WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export function splitEnglishIntoDictionaryTokens(
  text: string
): EnglishTextToken[] {
  const tokens: EnglishTextToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ENGLISH_WORD_PATTERN)) {
    const word = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, index) });
    }

    tokens.push({ type: 'word', text: word, lookup: word.toLowerCase() });
    lastIndex = index + word.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}
