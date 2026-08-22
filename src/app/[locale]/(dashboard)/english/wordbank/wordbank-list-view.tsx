'use client';

import { Loader2, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import { playWordbankAudio } from './wordbank-audio';
import { MasteryBadge, type WordbankTranslator } from './wordbank-mastery';

export function WordbankListView({
  items,
  selectedIds,
  isRemoving,
  onToggleSelected,
  onToggleAll,
  onRemoveWord,
  t,
}: {
  items: SavedVocabularyItem[];
  selectedIds: Set<string>;
  isRemoving: boolean;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  onRemoveWord: (word: string) => void;
  t: WordbankTranslator;
}) {
  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label={t('selectAll')}
              />
            </TableHead>
            <TableHead>{t('columnWord')}</TableHead>
            <TableHead>{t('columnMeaning')}</TableHead>
            <TableHead>{t('columnPronunciation')}</TableHead>
            <TableHead>{t('wordLists')}</TableHead>
            <TableHead>{t('masteryLabel')}</TableHead>
            <TableHead className="text-right">{t('actionsColumn')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              data-state={selectedIds.has(item.id) ? 'selected' : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => onToggleSelected(item.id)}
                  aria-label={t('selectWord', { word: item.word })}
                />
              </TableCell>
              <TableCell className="min-w-40">
                <span className="font-semibold text-primary">{item.word}</span>
              </TableCell>
              <TableCell className="min-w-80">
                <div className="flex flex-col gap-1">
                  <span>{item.englishDefinition}</span>
                  <span className="text-muted-foreground">
                    {item.vietnameseTranslation}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {item.ipa ?? t('missingIpa')}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.lists.length > 0 ? (
                    item.lists.map((list) => (
                      <Badge key={list.id} variant="outline">
                        {list.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">
                      {t('noWordLists')}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <MasteryBadge level={item.masteryLevel} t={t} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    void playWordbankAudio(item.word).catch(() => {
                      toast.error(t('audioFailed'));
                    });
                  }}
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
                  {isRemoving ? <Loader2 className="animate-spin" /> : <X />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
