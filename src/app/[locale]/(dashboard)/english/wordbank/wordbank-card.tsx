'use client';

import { BookmarkX, Loader2, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type {
  SavedVocabularyItem,
  VocabularyListSummary,
} from '@/services/english/SavedVocabularyService';
import { PracticeReveal } from './practice-reveal';
import { playWordbankAudio } from './wordbank-audio';
import { MasteryBadge, type WordbankTranslator } from './wordbank-mastery';

export function WordbankCard({
  item,
  isRemoving,
  practiceMode,
  lists,
  onRemoveWord,
  onAssignList,
  t,
}: {
  item: SavedVocabularyItem;
  isRemoving: boolean;
  practiceMode: boolean;
  lists: VocabularyListSummary[];
  onRemoveWord: (word: string) => void;
  onAssignList: (vocabularyIds: string[], listId: string) => void;
  t: WordbankTranslator;
}) {
  return (
    <Card className="min-h-80 rounded-xl">
      <CardHeader>
        <CardTitle className="flex flex-col gap-2">
          <span className="break-words text-primary text-2xl">{item.word}</span>
          <MasteryBadge level={item.masteryLevel} t={t} />
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            onClick={() => item.audioUrl && playWordbankAudio(item.audioUrl)}
            disabled={!item.audioUrl}
            aria-label={t('playPronunciation', { word: item.word })}
          >
            <Volume2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isRemoving}
            onClick={() => onRemoveWord(item.word)}
            aria-label={t('removeWord', { word: item.word })}
          >
            {isRemoving ? <Loader2 className="animate-spin" /> : <BookmarkX />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-mono text-muted-foreground text-base">
          {item.ipa ?? t('missingIpa')}
        </p>
        <div className="flex flex-col gap-2">
          <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
            <p className="text-foreground text-base leading-relaxed">
              {item.englishDefinition}
            </p>
          </PracticeReveal>
          <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
            <p className="text-muted-foreground text-base italic leading-relaxed">
              {item.vietnameseTranslation}
            </p>
          </PracticeReveal>
        </div>
        <blockquote className="border-primary/35 border-l-2 pl-4 text-muted-foreground text-base leading-relaxed">
          &ldquo;{item.exampleSentence}&rdquo;
        </blockquote>
        <div className="flex flex-wrap items-center gap-2">
          {item.lists.map((list) => (
            <Badge key={list.id} variant="outline">
              {list.name}
            </Badge>
          ))}
          <NativeSelect
            aria-label={t('addToWordList')}
            className="h-8 w-full sm:w-44"
            defaultValue=""
            onChange={(event) => {
              if (!event.currentTarget.value) return;
              onAssignList([item.id], event.currentTarget.value);
              event.currentTarget.value = '';
            }}
          >
            <NativeSelectOption value="">
              {t('addToWordList')}
            </NativeSelectOption>
            {lists.map((list) => (
              <NativeSelectOption key={list.id} value={list.id}>
                {list.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </CardContent>
    </Card>
  );
}
