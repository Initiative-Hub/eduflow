import {
  Download,
  Edit2,
  FolderPlus,
  Loader2,
  Move,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Dropzone } from '@/components/ui/dropzone';
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inventoryService } from '../inventory.service';
import type {
  InventoryEntry,
  InventoryMoveOption,
  InventoryPreviewState,
  InventoryTranslations,
} from '../inventory.types';
import { formatFileSize, getEntryTypeLabel } from '../inventory.utils';
import { InventoryPreviewContent } from './inventory-preview-content';

const ROOT_OPTION_VALUE = '__root__';

type InventoryDialogsProps = {
  closePreview: () => void;
  createFolderDialog: { open: boolean; value: string };
  createFolderPending: boolean;
  deleteDialog: { open: boolean; entries: InventoryEntry[] };
  deletePending: boolean;
  handleCreateFolderSubmit: () => void;
  handleDeleteConfirm: () => void;
  handleMoveSubmit: () => void;
  handleRenameSubmit: () => void;
  isStorageLimitReached: boolean;
  moveDialog: {
    open: boolean;
    entry: InventoryEntry | null;
    parentId: string | null;
  };
  moveOptions: InventoryMoveOption[];
  movePending: boolean;
  previewDialog: InventoryPreviewState | null;
  renameDialog: { open: boolean; entry: InventoryEntry | null; value: string };
  renamePending: boolean;
  setCreateFolderDialog: Dispatch<
    SetStateAction<{
      open: boolean;
      value: string;
    }>
  >;
  setDeleteDialog: Dispatch<
    SetStateAction<{ open: boolean; entries: InventoryEntry[] }>
  >;
  setMoveDialog: Dispatch<
    SetStateAction<{
      open: boolean;
      entry: InventoryEntry | null;
      parentId: string | null;
    }>
  >;
  setRenameDialog: Dispatch<
    SetStateAction<{
      open: boolean;
      entry: InventoryEntry | null;
      value: string;
    }>
  >;
  setUploadOpen: (open: boolean) => void;
  t: InventoryTranslations;
  uploadOpen: boolean;
  uploadPending: boolean;
  onUploadFiles: (files: File[]) => void;
  maxFileSizeBytes: number;
};

export function InventoryDialogs({
  closePreview,
  createFolderDialog,
  createFolderPending,
  deleteDialog,
  deletePending,
  handleCreateFolderSubmit,
  handleDeleteConfirm,
  handleMoveSubmit,
  handleRenameSubmit,
  isStorageLimitReached,
  moveDialog,
  moveOptions,
  movePending,
  onUploadFiles,
  maxFileSizeBytes,
  previewDialog,
  renameDialog,
  renamePending,
  setCreateFolderDialog,
  setDeleteDialog,
  setMoveDialog,
  setRenameDialog,
  setUploadOpen,
  t,
  uploadOpen,
  uploadPending,
}: InventoryDialogsProps) {
  return (
    <>
      <Dialog open={uploadOpen} onOpenChange={(open) => setUploadOpen(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('uploadDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('uploadDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Dropzone
            maxFiles={1}
            maxSize={maxFileSizeBytes}
            disabled={uploadPending || isStorageLimitReached}
            onDrop={(acceptedFiles) => {
              setUploadOpen(false);
              onUploadFiles(acceptedFiles);
            }}
            onError={(error) => {
              const message = error.message.includes('File is larger than')
                ? t('toast.fileTooLarge', {
                    size: formatFileSize(maxFileSizeBytes),
                  })
                : error.message;
              toast.error(message);
            }}
          >
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                {uploadPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {t('uploadDialog.dropzoneTitle')}
                </div>
                <div className="text-muted-foreground text-sm">
                  {t('uploadDialog.dropzoneDescription', {
                    size: formatFileSize(maxFileSizeBytes),
                  })}
                </div>
              </div>
              <Badge variant="outline">{t('uploadDialog.dropzoneHint')}</Badge>
            </div>
          </Dropzone>
          {isStorageLimitReached && (
            <p className="text-destructive text-sm">
              {t('storage.limitReached')}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createFolderDialog.open}
        onOpenChange={(open) =>
          setCreateFolderDialog(
            open ? { ...createFolderDialog, open } : { open: false, value: '' }
          )
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createFolderDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createFolderDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="create-folder-name">
                {t('createFolderDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="create-folder-name"
                  value={createFolderDialog.value}
                  onChange={(event) =>
                    setCreateFolderDialog((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  placeholder={t('createFolderDialog.placeholder')}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={handleCreateFolderSubmit}
              disabled={!createFolderDialog.value.trim() || createFolderPending}
            >
              {createFolderPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <FolderPlus data-icon="inline-start" />
              )}
              {t('createFolderDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameDialog.open}
        onOpenChange={(open) =>
          setRenameDialog(
            open
              ? { ...renameDialog, open }
              : { open: false, entry: null, value: '' }
          )
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('renameDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('renameDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-item-name">
                {t('renameDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="rename-item-name"
                  value={renameDialog.value}
                  onChange={(event) =>
                    setRenameDialog((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={handleRenameSubmit}
              disabled={!renameDialog.value.trim() || renamePending}
            >
              {renamePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Edit2 data-icon="inline-start" />
              )}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={moveDialog.open}
        onOpenChange={(open) =>
          setMoveDialog(
            open
              ? { ...moveDialog, open }
              : { open: false, entry: null, parentId: null }
          )
        }
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('moveDialog.title')}</DialogTitle>
            <DialogDescription>{t('moveDialog.description')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="move-target-folder">
                {t('moveDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={moveDialog.parentId ?? ROOT_OPTION_VALUE}
                  onValueChange={(value) =>
                    setMoveDialog((current) => ({
                      ...current,
                      parentId: value === ROOT_OPTION_VALUE ? null : value,
                    }))
                  }
                >
                  <SelectTrigger id="move-target-folder">
                    <SelectValue placeholder={t('moveDialog.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {moveOptions.map((option) => (
                        <SelectItem
                          key={option.id ?? ROOT_OPTION_VALUE}
                          value={option.id ?? ROOT_OPTION_VALUE}
                        >
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button onClick={handleMoveSubmit} disabled={movePending}>
              {movePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Move data-icon="inline-start" />
              )}
              {t('moveDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog(open ? deleteDialog : { open: false, entries: [] })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', {
                count: deleteDialog.entries.length,
              })}
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-left text-foreground text-sm">
                <div className="font-medium">
                  {deleteDialog.entries
                    .slice(0, 4)
                    .map((entry) => entry.name)
                    .join(', ')}
                </div>
                {deleteDialog.entries.length > 4 && (
                  <div className="text-muted-foreground text-xs">
                    {t('deleteDialog.more', {
                      count: deleteDialog.entries.length - 4,
                    })}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(previewDialog)}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="w-full max-w-[95vw] overflow-hidden lg:max-w-7xl">
          <DialogHeader>
            <DialogTitle>
              {previewDialog?.entry.name ?? t('previewDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {previewDialog
                ? t('previewDialog.description', {
                    type: getEntryTypeLabel(previewDialog.entry),
                  })
                : t('previewDialog.placeholder')}
            </DialogDescription>
          </DialogHeader>
          {previewDialog && (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-3">
              <InventoryPreviewContent
                key={previewDialog.entry.id}
                preview={previewDialog}
                downloadLabel={t('actions.download')}
                unsupportedLabel={t('previewDialog.unsupported')}
                textPreviewLoadingLabel={t('previewDialog.loading')}
                textPreviewErrorLabel={t('previewDialog.textError')}
              />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={closePreview}>
                {t('actions.cancel')}
              </Button>
            </DialogClose>
            {previewDialog && (
              <Button asChild>
                <a
                  href={inventoryService.getDownloadPayload(
                    previewDialog.entry.id
                  )}
                >
                  <Download data-icon="inline-start" />
                  {t('actions.download')}
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
