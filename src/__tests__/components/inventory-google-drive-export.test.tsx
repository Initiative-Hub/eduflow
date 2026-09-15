import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { InventoryCard } from '@/app/[locale]/(dashboard)/inventory/_components/inventory-card';
import { InventoryTableView } from '@/app/[locale]/(dashboard)/inventory/_components/inventory-table-view';
import type { InventoryEntry } from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import enMessages from '../../../messages/en.json';

const baseEntry: InventoryEntry = {
  id: '2b25a6da-09bc-4783-8a0d-60811389d612',
  userId: 'user-1',
  parentId: null,
  name: 'presentation.pptx',
  isFolder: false,
  metadata: null,
  status: 'READY',
  fileSize: 1024,
  mimeType:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  extension: 'pptx',
  bucket: 'inventory',
  objectKey: 'user-1/presentation.pptx',
  checksumSha256: null,
  vectorDbId: null,
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
  uploadedAt: '2026-09-12T00:00:00.000Z',
  deletedAt: null,
  thumbnailObjectKey: null,
  thumbnailMimeType: null,
};

function renderInventoryCard(
  entry: InventoryEntry,
  actions = {
    onDownload: vi.fn(),
    onSaveToDrive: vi.fn(),
    onShare: vi.fn(),
  }
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <InventoryCard
          entry={entry}
          locale="en"
          onDelete={vi.fn()}
          onDownload={actions.onDownload}
          onMove={vi.fn()}
          onRename={vi.fn()}
          onSaveToDrive={actions.onSaveToDrive}
          onShare={actions.onShare}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  const trigger = result.container.querySelector(
    '[data-slot="dropdown-menu-trigger"]'
  );
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error('Inventory action menu trigger was not rendered.');
  }

  return { ...result, ...actions, trigger };
}

function InventoryTableHarness({
  entry,
  onSaveToDrive,
}: {
  entry: InventoryEntry;
  onSaveToDrive: (entry: InventoryEntry) => void;
}) {
  const t = useTranslations('InventoryPage');

  return (
    <InventoryTableView
      t={t}
      entries={[entry]}
      locale="en"
      selectedIds={[]}
      selectionCount={0}
      getUploadProgress={() => undefined}
      onDeleteEntry={vi.fn()}
      onDownload={vi.fn()}
      onMove={vi.fn()}
      onNavigateIntoFolder={vi.fn()}
      onOpen={vi.fn()}
      onPreview={vi.fn()}
      onRename={vi.fn()}
      onSaveToDrive={onSaveToDrive}
      onSaveToOneDrive={vi.fn()}
      onSelectAll={vi.fn()}
      onSelectEntry={vi.fn()}
      onShare={vi.fn()}
      isSavingToDrive={false}
    />
  );
}

describe('inventory Google Drive export actions', () => {
  it.each([
    {
      extension: 'pptx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      name: 'presentation.pptx',
    },
    {
      extension: 'zip',
      mimeType: 'application/zip',
      name: 'resources.zip',
    },
    {
      extension: 'custom',
      mimeType: 'application/x-custom-format',
      name: 'archive.custom',
    },
  ])(
    'offers ready $name files that cannot be previewed all supported actions',
    async (file) => {
      const user = userEvent.setup();
      const entry = { ...baseEntry, ...file };
      const { onDownload, onSaveToDrive, onShare, trigger } =
        renderInventoryCard(entry);

      await user.click(trigger);
      expect(screen.queryByRole('menuitem', { name: 'Preview' })).toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Share' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Download' })).toBeDefined();
      expect(
        screen.getByRole('menuitem', { name: 'Save to Google Drive' })
      ).toBeDefined();

      await user.click(screen.getByRole('menuitem', { name: 'Share' }));
      expect(onShare).toHaveBeenCalledWith(entry);

      await user.click(trigger);
      await user.click(screen.getByRole('menuitem', { name: 'Download' }));
      expect(onDownload).toHaveBeenCalledWith(entry);

      await user.click(trigger);
      await user.click(
        screen.getByRole('menuitem', { name: 'Save to Google Drive' })
      );

      expect(onSaveToDrive).toHaveBeenCalledWith(entry);
    }
  );

  it('shows the export action in the table menu for a ready PPTX', async () => {
    const user = userEvent.setup();
    const onSaveToDrive = vi.fn();
    const result = render(
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <InventoryTableHarness
            entry={baseEntry}
            onSaveToDrive={onSaveToDrive}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
    const trigger = result.container.querySelector(
      '[data-slot="dropdown-menu-trigger"]'
    );
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('Inventory table action menu trigger was not rendered.');
    }

    await user.click(trigger);
    await user.click(
      screen.getByRole('menuitem', { name: 'Save to Google Drive' })
    );

    expect(onSaveToDrive).toHaveBeenCalledWith(baseEntry);
  });

  it('does not expose Drive export for folders or files still uploading', async () => {
    const user = userEvent.setup();
    const { rerender, trigger } = renderInventoryCard({
      ...baseEntry,
      isFolder: true,
      name: 'Course materials',
    });

    await user.click(trigger);
    expect(
      screen.queryByRole('menuitem', { name: 'Save to Google Drive' })
    ).toBeNull();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <InventoryCard
            entry={{ ...baseEntry, status: 'UPLOADING' }}
            locale="en"
            onDelete={vi.fn()}
            onMove={vi.fn()}
            onRename={vi.fn()}
            onSaveToDrive={vi.fn()}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Save to Google Drive' })
    ).toBeNull();
  });
});
