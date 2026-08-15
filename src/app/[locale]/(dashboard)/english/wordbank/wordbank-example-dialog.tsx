'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Plus, Quote, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import type { WordbankTranslator } from './wordbank-mastery';
import { type WordExample, wordbankApi } from './wordbank.service';

interface WordbankExampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SavedVocabularyItem;
  isUpdating: boolean;
  onUpdateExample: (exampleSentence: string, examples: string[]) => void;
  t: WordbankTranslator;
}

export function WordbankExampleDialog({
  open,
  onOpenChange,
  item,
  isUpdating,
  onUpdateExample,
  t,
}: WordbankExampleDialogProps) {
  const [customExample, setCustomExample] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['word-examples', item.word],
    queryFn: () => wordbankApi.fetchExamples(item.word),
    enabled: open && Boolean(item.word),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const crawledExamples = data?.examples ?? [];

  const handleSelectExample = (ex: WordExample) => {
    const formatted = ex.vietnamese
      ? `"${ex.english}" — ${ex.vietnamese}`
      : `"${ex.english}"`;

    const existingExamples = item.examples ?? [];
    const updatedExamples = Array.from(
      new Set([...existingExamples, formatted])
    );

    onUpdateExample(formatted, updatedExamples);
    onOpenChange(false);
  };

  const handleSaveCustom = () => {
    if (!customExample.trim()) return;
    const formatted = customExample.trim();
    const existingExamples = item.examples ?? [];
    const updatedExamples = Array.from(
      new Set([...existingExamples, formatted])
    );

    onUpdateExample(formatted, updatedExamples);
    setCustomExample('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-primary" />
            Examples for "{item.word}"
          </DialogTitle>
          <DialogDescription>
            Fetch live examples from Laban Dict or add custom examples to your
            card.
          </DialogDescription>
        </DialogHeader>

        {/* Existing Card Example */}
        {item.exampleSentence && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <span className="font-semibold text-primary">Current Example:</span>
            <p className="mt-1 text-foreground italic">
              {item.exampleSentence}
            </p>
          </div>
        )}

        {/* Crawled Examples Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            <span>Crawled Examples (Laban Dict)</span>
            {isLoading && <Loader2 className="size-3.5 animate-spin" />}
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-border/80 p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span>Crawling dictionary examples...</span>
              </div>
            ) : crawledExamples.length > 0 ? (
              <div className="flex flex-col gap-2">
                {crawledExamples.map((ex, index) => {
                  const exampleText = ex.vietnamese
                    ? `"${ex.english}" — ${ex.vietnamese}`
                    : `"${ex.english}"`;
                  const isSelected = item.exampleSentence === exampleText;

                  return (
                    <div
                      key={`${ex.english}-${index}`}
                      className="group flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-foreground">
                          "{ex.english}"
                        </span>
                        {ex.vietnamese && (
                          <span className="text-muted-foreground">
                            {ex.vietnamese}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'secondary' : 'outline'}
                        disabled={isUpdating}
                        onClick={() => handleSelectExample(ex)}
                        className="h-8 shrink-0 text-xs"
                      >
                        {isSelected ? (
                          <>
                            <Check className="mr-1 size-3" />
                            Current
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 size-3" />
                            Use
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground text-xs">
                <Quote className="mb-1 size-8 text-muted-foreground/40" />
                <span>No dictionary examples found for "{item.word}".</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Example Input */}
        <div className="flex flex-col gap-2 border-t pt-2">
          <Label htmlFor="custom-example" className="font-semibold text-xs">
            Add Custom Example
          </Label>
          <div className="flex gap-2">
            <Input
              id="custom-example"
              placeholder='e.g. "She loves to eat fresh apples every morning."'
              value={customExample}
              onChange={(e) => setCustomExample(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveCustom();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={!customExample.trim() || isUpdating}
              onClick={handleSaveCustom}
            >
              Add
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
