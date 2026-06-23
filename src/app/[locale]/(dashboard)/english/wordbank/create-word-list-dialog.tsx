'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { WordbankTranslator } from './wordbank-mastery';

export function CreateWordListDialog({
  isPending,
  onCreate,
  t,
}: {
  isPending: boolean;
  onCreate: (name: string) => void;
  t: WordbankTranslator;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Plus data-icon="inline-start" />
          {t('createWordList')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createWordListTitle')}</DialogTitle>
          <DialogDescription>
            {t('createWordListDescription')}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2 text-sm">
          {t('wordListNameLabel')}
          <Input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={t('wordListNamePlaceholder')}
          />
        </label>
        <DialogFooter>
          <Button
            type="button"
            disabled={!name.trim() || isPending}
            onClick={() => {
              onCreate(name);
              setName('');
              setOpen(false);
            }}
          >
            {isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
