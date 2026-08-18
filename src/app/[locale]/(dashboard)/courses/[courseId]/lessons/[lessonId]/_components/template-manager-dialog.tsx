'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { TemplateImportSource } from '../slide.service';
import {
  useImportSlideTemplate,
  useSlideTemplatePreviews,
} from '../use-lesson';

const MAX_TEMPLATE_UPLOAD_MB = 150;
const MAX_TEMPLATE_UPLOAD_BYTES = MAX_TEMPLATE_UPLOAD_MB * 1024 * 1024;

/** Rounded MB, so the rejection message states the actual file size. */
function formatFileSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

const IMPORT_SOURCE_HINTS: Record<TemplateImportSource, string> = {
  auto: 'Detects brand templates automatically and falls back to the deck slides.',
  layouts:
    'Best for university or company templates whose designs live in the Slide Master.',
  slides: 'Extracts only the slides that exist in the uploaded deck.',
};

interface CollectionItem {
  name: string;
  description?: string;
  slide_types?: string[];
  palette?: string[];
}

interface TemplateManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCollection: string;
  onSelectCollection: (name: string) => void;
  collections: CollectionItem[];
  onUploadSuccess?: () => Promise<void> | void;
  isLoading?: boolean;
}

export function TemplateManagerDialog({
  isOpen,
  onOpenChange,
  selectedCollection,
  onSelectCollection,
  collections,
  onUploadSuccess,
  isLoading = false,
}: TemplateManagerDialogProps) {
  const t = useTranslations('Courses.LessonPresentation');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [importSource, setImportSource] =
    useState<TemplateImportSource>('auto');
  const isPptxUpload = Boolean(
    uploadFile?.name.toLowerCase().endsWith('.pptx')
  );

  const [previewCollection, setPreviewCollection] = useState<string | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoomedSlideIndex, setZoomedSlideIndex] = useState<number | null>(null);

  // TanStack Query for previews
  const { data: previewsData, isLoading: isLoadingPreviews } =
    useSlideTemplatePreviews(previewCollection, isPreviewOpen);
  const previews = previewsData || [];

  // TanStack Query mutation for uploads
  const importSlideTemplate = useImportSlideTemplate();
  const isUploading = importSlideTemplate.isPending;

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    if (uploadFile.size > MAX_TEMPLATE_UPLOAD_BYTES) {
      toast.error(
        t('templateFileTooLarge', {
          size: formatFileSizeMb(uploadFile.size),
          max: MAX_TEMPLATE_UPLOAD_MB,
        })
      );
      return;
    }

    const nameVal = collectionName.trim();
    importSlideTemplate.mutate(
      {
        file: uploadFile,
        name: nameVal || undefined,
        source: isPptxUpload ? importSource : undefined,
      },
      {
        onSuccess: async () => {
          const importedName =
            nameVal ||
            uploadFile.name.substring(0, uploadFile.name.lastIndexOf('.'));
          toast.success(
            'Template collection uploaded and imported successfully!'
          );
          setUploadFile(null);
          setCollectionName('');
          setImportSource('auto');
          if (onUploadSuccess) {
            await onUploadSuccess();
          }
          onSelectCollection(importedName);
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to import templates.');
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col overflow-hidden border-border bg-background px-6 py-5 text-foreground sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-bold text-foreground text-lg">
              Presentation Templates Manager
            </DialogTitle>
            <DialogDescription className="mt-1 text-muted-foreground text-xs">
              Choose a visual style collection or upload a new template bank to
              customize slide renderings.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleUploadTemplate}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-1">
              {/* Choose Template Style */}
              <div className="space-y-3">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Choose Template Style
                </span>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Spinner className="mr-2 h-6 w-6 text-primary" />
                    Loading template library...
                  </div>
                ) : collections.length === 0 ? (
                  <div className="rounded-xl border border-border border-dashed p-4 text-center text-muted-foreground text-xs">
                    No styles found. Upload a PowerPoint deck below.
                  </div>
                ) : (
                  <div className="grid max-h-65 grid-cols-1 gap-2.5 overflow-y-auto pr-1">
                    {collections.map((col) => {
                      const isSelected = selectedCollection === col.name;
                      return (
                        <div
                          key={col.name}
                          className={cn(
                            'group relative flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border bg-muted/40 hover:bg-accent/40'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectCollection(col.name)}
                            className="min-w-0 flex-1 py-1 pr-2 text-left"
                          >
                            <h4 className="truncate font-semibold text-foreground text-sm">
                              {col.name === 'starter'
                                ? 'Default Starter'
                                : col.name === 'neon_dark'
                                  ? 'Neon Dark Theme'
                                  : col.name}
                            </h4>
                            {col.description && (
                              <p className="mt-0.5 truncate pr-2 text-muted-foreground text-xs">
                                {col.description}
                              </p>
                            )}
                          </button>

                          <div className="flex shrink-0 items-center gap-2">
                            {col.palette && col.palette.length > 0 && (
                              <div className="flex items-center gap-1">
                                {col.palette.slice(0, 3).map((color, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="h-2.5 w-2.5 rounded-full border border-background"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewCollection(col.name);
                                setIsPreviewOpen(true);
                              }}
                              title="Preview Style"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator className="my-1 h-px shrink-0 bg-border" />

              {/* Upload Area */}
              <div className="space-y-4">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Or Upload New Template Bank
                </span>

                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs">
                    Collection Name (optional)
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g. Minimalist Dark"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="h-10 rounded-xl border-input bg-muted/40 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs">
                    {t('templateFileLabel', { max: MAX_TEMPLATE_UPLOAD_MB })}
                  </span>
                  <Dropzone
                    src={uploadFile ? [uploadFile] : undefined}
                    onDrop={(acceptedFiles) => {
                      if (acceptedFiles && acceptedFiles.length > 0) {
                        setUploadFile(acceptedFiles[0]);
                      }
                    }}
                    accept={{
                      'application/zip': ['.zip'],
                      'image/svg+xml': ['.svg'],
                      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                        ['.pptx'],
                    }}
                    // Rejects oversized files with a readable message instead of
                    // react-dropzone's raw "larger than N bytes" text.
                    validator={(file) =>
                      file.size > MAX_TEMPLATE_UPLOAD_BYTES
                        ? {
                            code: 'file-too-large',
                            message: t('templateFileTooLarge', {
                              size: formatFileSizeMb(file.size),
                              max: MAX_TEMPLATE_UPLOAD_MB,
                            }),
                          }
                        : null
                    }
                    onError={(error) =>
                      toast.error(error.message || t('templateUploadRejected'))
                    }
                    disabled={isUploading}
                    className="border-2 border-input border-dashed bg-muted/30 focus-within:ring-ring hover:bg-accent/20"
                  >
                    <DropzoneContent />
                    <DropzoneEmptyState />
                  </Dropzone>
                </div>

                {isPptxUpload && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs">
                      How should this PowerPoint be read?
                    </span>
                    <Select
                      value={importSource}
                      onValueChange={(value) =>
                        setImportSource(value as TemplateImportSource)
                      }
                      disabled={isUploading}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-input bg-muted/40 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="layouts">
                          Brand template (use Slide Master layouts)
                        </SelectItem>
                        <SelectItem value="slides">
                          Use the slides as they are
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      {IMPORT_SOURCE_HINTS[importSource]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto flex shrink-0 items-center justify-end gap-3 border-border border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  setUploadFile(null);
                  setCollectionName('');
                }}
                disabled={isUploading}
                className="rounded-xl font-medium text-muted-foreground"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Import Templates
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Larger Canva-like Slide Previews Pop-up Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col rounded-2xl border border-border bg-background p-6 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-foreground text-lg capitalize">
              Style Preview:{' '}
              {previewCollection === 'starter'
                ? 'Default Starter'
                : previewCollection === 'neon_dark'
                  ? 'Neon Dark Theme'
                  : previewCollection}
            </DialogTitle>
          </DialogHeader>

          {isLoadingPreviews ? (
            <div className="flex min-h-100 flex-1 flex-col items-center justify-center text-muted-foreground text-sm">
              <Spinner className="mb-2 h-8 w-8 text-primary" />
              Loading preview slides...
            </div>
          ) : previews.length === 0 ? (
            <div className="flex min-h-100 flex-1 items-center justify-center text-muted-foreground text-xs">
              No preview slides found for this template style.
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto py-2 pr-1 md:grid-cols-2">
              {previews.map((preview, idx) => (
                <div
                  key={preview.category}
                  className="flex flex-col space-y-1.5"
                >
                  <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                    {preview.category.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    className="group flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-accent/20 hover:shadow-md"
                    onClick={() => setZoomedSlideIndex(idx)}
                    aria-label={`Zoom ${preview.category.replace(/_/g, ' ')} preview`}
                  >
                    <img
                      src={preview.url}
                      alt={`${preview.category.replace(/_/g, ' ')} template preview`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Slide Zoom Dialog */}
      <Dialog
        open={zoomedSlideIndex !== null}
        onOpenChange={(open) => {
          if (!open) setZoomedSlideIndex(null);
        }}
      >
        <DialogContent className="flex aspect-video w-[95vw] flex-col items-center justify-center overflow-hidden rounded-2xl border-none bg-background p-2 sm:max-w-[85vw] sm:rounded-2xl">
          {zoomedSlideIndex !== null && (
            <div className="group/lightbox relative flex h-full w-full flex-col">
              {/* Slide name overlay */}
              <div className="absolute top-4 left-4 z-10 rounded-full bg-background/80 px-4 py-1.5 font-semibold text-foreground text-xs uppercase tracking-wider backdrop-blur-sm">
                {previews[zoomedSlideIndex]?.category.replace(/_/g, ' ')}
              </div>

              <div className="flex h-full w-full items-center justify-center bg-background p-2">
                <img
                  src={previews[zoomedSlideIndex]?.url}
                  alt={`${previews[zoomedSlideIndex]?.category.replace(/_/g, ' ')} template preview`}
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Navigation Left Arrow */}
              {zoomedSlideIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 left-4 size-12 -translate-y-1/2 rounded-full bg-background/70 text-foreground opacity-70 backdrop-blur-sm transition-all hover:bg-background hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedSlideIndex(zoomedSlideIndex - 1);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Navigation Right Arrow */}
              {zoomedSlideIndex < previews.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-4 size-12 -translate-y-1/2 rounded-full bg-background/70 text-foreground opacity-70 backdrop-blur-sm transition-all hover:bg-background hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedSlideIndex(zoomedSlideIndex + 1);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
