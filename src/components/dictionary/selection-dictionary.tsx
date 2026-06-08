'use client';

import { useEffect, useState } from 'react';
import { DictionaryDialog } from './dictionary-dialog';
import { useTextSelection } from '@/hooks/use-text-selection';

export function SelectionDictionary() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { selectedWord, clearSelection } = useTextSelection();

  // Open dialog when a word is selected
  useEffect(() => {
    if (selectedWord) {
      setIsDialogOpen(true);
    }
  }, [selectedWord]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    clearSelection();
  };

  return (
    <DictionaryDialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCloseDialog();
        }
      }}
      word={selectedWord || null}
    />
  );
}
