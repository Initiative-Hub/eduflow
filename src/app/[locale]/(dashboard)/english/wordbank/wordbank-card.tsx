import { useState } from 'react';
import { Loader2, Plus, Sparkles, Volume2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  SavedVocabularyItem,
  VocabularyListSummary,
} from '@/services/english/SavedVocabularyService';
import { PracticeReveal } from './practice-reveal';
import { playWordbankAudio } from './wordbank-audio';
import { WordbankExampleDialog } from './wordbank-example-dialog';
import {
  WordbankListManager,
  type WordbankListUpdate,
} from './wordbank-list-manager';
import { MasteryBadge, type WordbankTranslator } from './wordbank-mastery';

export function WordbankCard({
  item,
  isRemoving,
  isUpdating,
  practiceMode,
  lists,
  onRemoveWord,
  onUpdateLists,
  onUpdateExample,
  t,
}: {
  item: SavedVocabularyItem;
  isRemoving: boolean;
  isUpdating: boolean;
  practiceMode: boolean;
  lists: VocabularyListSummary[];
  onRemoveWord: (word: string) => void;
  onUpdateLists: (vocabularyIds: string[], update: WordbankListUpdate) => void;
  onUpdateExample?: (
    vocabularyId: string,
    exampleSentence: string,
    examples: string[]
  ) => void;
  t: WordbankTranslator;
}) {
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const itemListIds = new Set(item.lists.map((list) => list.id));

  return (
    <>
      <Card className="min-h-80 rounded-xl flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              <span className="wrap-break-word text-2xl text-primary font-bold">
                {item.word}
              </span>
              <MasteryBadge level={item.masteryLevel} t={t} />
            </CardTitle>
            <CardAction className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => playWordbankAudio(item.audioUrl, item.word)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={t('playPronunciation', { word: item.word })}
              >
                <Volume2 className="size-4" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isRemoving}
                onClick={() => onRemoveWord(item.word)}
                aria-label={t('removeWord', { word: item.word })}
              >
                {isRemoving ? <Loader2 className="animate-spin" /> : <X />}
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <p className="font-mono text-base text-muted-foreground">
              {item.ipa ?? t('missingIpa')}
            </p>
            <div className="flex flex-col gap-2">
              <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
                <p className="text-base text-foreground leading-relaxed">
                  {item.englishDefinition}
                </p>
              </PracticeReveal>
              <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.vietnameseTranslation}
                </p>
              </PracticeReveal>
            </div>

            {/* Main Example Sentence */}
            <blockquote className="mb-1 border-primary/30 border-l-2 pl-4 text-base text-muted-foreground leading-relaxed">
              &ldquo;{item.exampleSentence}&rdquo;
            </blockquote>

            {/* Additional Stored Examples */}
            {item.examples && item.examples.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  More Examples:
                </span>
                {item.examples.map((ex, i) => (
                  <p key={i} className="text-xs text-muted-foreground/90 italic pl-2 border-l border-border">
                    {ex}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            {item.lists.map((list) => (
              <Badge key={list.id} variant="outline" className="gap-1 pr-1">
                {list.name}
                <button
                  type="button"
                  className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  disabled={isUpdating}
                  onClick={() =>
                    onUpdateLists([item.id], { removeListIds: [list.id] })
                  }
                  aria-label={t('removeFromList', { list: list.name })}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}

            <WordbankListManager
              vocabularyIds={[item.id]}
              lists={lists}
              disabled={isUpdating}
              getMembership={(listId) => itemListIds.has(listId)}
              onUpdateLists={onUpdateLists}
              t={t}
            />

            {/* Fetch/Add Example Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExampleDialogOpen(true)}
              className="h-8 rounded-lg text-xs gap-1 border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="size-3 text-primary" />
              <span>Examples</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <WordbankExampleDialog
        open={exampleDialogOpen}
        onOpenChange={setExampleDialogOpen}
        item={item}
        isUpdating={isUpdating}
        onUpdateExample={(exampleSentence, examples) => {
          onUpdateExample?.(item.id, exampleSentence, examples);
        }}
        t={t}
      />
    </>
  );
}
