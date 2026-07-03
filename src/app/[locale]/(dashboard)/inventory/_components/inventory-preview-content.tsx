'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '../inventory.service';
import type { InventoryPreviewState } from '../inventory.types';
import { getInventoryPreviewKind } from '../inventory.utils';

type InventoryPreviewContentProps = {
  preview: InventoryPreviewState;
  downloadLabel: string;
  unsupportedLabel: string;
  textPreviewLoadingLabel: string;
  textPreviewErrorLabel: string;
};

type InventoryTextPreviewProps = {
  url: string;
  loadingLabel: string;
  errorLabel: string;
};

function InventoryTextPreview({
  url,
  loadingLabel,
  errorLabel,
}: InventoryTextPreviewProps) {
  const textQuery = useQuery({
    queryKey: ['inventory', 'text-preview', url],
    queryFn: async () => {
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Text preview failed');
      }

      return response.text();
    },
    retry: 1,
  });

  if (textQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
        {loadingLabel}
      </div>
    );
  }

  if (textQuery.isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
        {errorLabel}
      </div>
    );
  }

  return (
    <pre className="max-h-[70vh] overflow-auto rounded-xl bg-background p-4 text-sm leading-6">
      <code>{textQuery.data}</code>
    </pre>
  );
}

export function InventoryPreviewContent({
  preview,
  downloadLabel,
  unsupportedLabel,
  textPreviewLoadingLabel,
  textPreviewErrorLabel,
}: InventoryPreviewContentProps) {
  const [previewRenderFailed, setPreviewRenderFailed] = useState(false);
  const previewKind = getInventoryPreviewKind(preview.entry);

  if (!preview.url || previewRenderFailed || !previewKind) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 border-dashed bg-background/60 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileIcon />
        </div>
        <div className="space-y-1">
          <div className="font-medium">{preview.entry.name}</div>
          <div className="text-muted-foreground text-sm">
            {unsupportedLabel}
          </div>
        </div>
        <Button asChild>
          <a href={inventoryService.getDownloadPayload(preview.entry.id)}>
            <Download data-icon="inline-start" />
            {downloadLabel}
          </a>
        </Button>
      </div>
    );
  }

  if (previewKind === 'image') {
    return (
      <Image
        src={preview.url}
        alt={preview.entry.name}
        width={1600}
        height={1200}
        unoptimized
        onError={() => setPreviewRenderFailed(true)}
        className="max-h-[70vh] w-full rounded-xl object-contain"
      />
    );
  }

  if (previewKind === 'pdf') {
    return (
      <iframe
        src={preview.url}
        title={preview.entry.name}
        onError={() => setPreviewRenderFailed(true)}
        className="h-[70vh] w-full rounded-xl border border-border/60 bg-background"
      />
    );
  }

  return (
    <InventoryTextPreview
      url={preview.url}
      loadingLabel={textPreviewLoadingLabel}
      errorLabel={textPreviewErrorLabel}
    />
  );
}
