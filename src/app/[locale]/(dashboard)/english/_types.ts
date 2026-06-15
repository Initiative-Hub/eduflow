export type Direction = 'en-vi' | 'vi-en';

export type ParagraphPlayState = 'idle' | 'loading' | 'playing';

export type VirtualAnchor = { getBoundingClientRect: () => DOMRect };

export interface SourceLookup {
  word: string;
  anchorElement: VirtualAnchor;
}

export interface TranslationPanelState {
  sourceText: string;
  translatedText: string;
  direction: Direction;
  isAnalyzing: boolean;
  paragraphPlayState: ParagraphPlayState;
}

export interface TranslationPanelActions {
  onSourceTextChange: (text: string) => void;
  onSwapDirection: () => void;
  onTranslateAndAnalyze: () => void;
  onPlayParagraph: () => void;
}

export interface TranslationPanelLookupActions {
  onWordLookup: (word: string, anchor: VirtualAnchor) => void;
  onClearLookup: () => void;
}
