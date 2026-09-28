import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { InventoryCard } from '@/app/[locale]/(dashboard)/inventory/_components/inventory-card';
import { InventoryTableView } from '@/app/[locale]/(dashboard)/inventory/_components/inventory-table-view';
import type { InventoryEntry } from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import enMessages from '../../../messages/en.json';

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react');
  const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  } | null>(null);

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);

      return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
          {children}
        </DropdownMenuContext.Provider>
      );
    },
    DropdownMenuContent: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => {
      const context = React.useContext(DropdownMenuContext);
      return context?.open ? <div {...props}>{children}</div> : null;
    },
    DropdownMenuItem: ({
      children,
      onClick,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
      const context = React.useContext(DropdownMenuContext);

      return (
        <button
          {...props}
          onClick={(event) => {
            onClick?.(event);
            context?.setOpen(false);
          }}
          role="menuitem"
          type="button"
        >
          {children}
        </button>
      );
    },
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
      const context = React.useContext(DropdownMenuContext);
      const trigger = React.Children.only(children) as React.ReactElement<{
        'data-slot'?: string;
        onClick?: React.MouseEventHandler;
      }>;

      return React.cloneElement(trigger, {
        'data-slot': 'dropdown-menu-trigger',
        onClick: (event) => {
          trigger.props.onClick?.(event);
          context?.setOpen((open) => !open);
        },
      });
    },
  };
});

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

      fireEvent.click(trigger);
      expect(screen.queryByRole('menuitem', { name: 'Preview' })).toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Share' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Download' })).toBeDefined();
      expect(
        screen.getByRole('menuitem', { name: 'Save to Google Drive' })
      ).toBeDefined();

      fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));
      expect(onShare).toHaveBeenCalledWith(entry);

      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Download' }));
      expect(onDownload).toHaveBeenCalledWith(entry);

      fireEvent.click(trigger);
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Save to Google Drive' })
      );

      expect(onSaveToDrive).toHaveBeenCalledWith(entry);
    }
  );

  it('shows the export action in the table menu for a ready PPTX', () => {
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

    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Save to Google Drive' })
    );

    expect(onSaveToDrive).toHaveBeenCalledWith(baseEntry);
  });

  it('does not expose Drive export for folders or files still uploading', () => {
    const { rerender, trigger } = renderInventoryCard({
      ...baseEntry,
      isFolder: true,
      name: 'Course materials',
    });

    fireEvent.click(trigger);
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
