'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getCleanedPreviewSvg } from '@/utils/slide-preview';
import {
  useImportSlideTemplate,
  useSlideTemplatePreviews,
} from '../use-lesson';

interface CollectionItem {
  name: string;
  description?: string;
  slide_types?: string[];
  palette?: string[];
}

interface TemplateUploadSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCollection: string;
  onSelectCollection: (name: string) => void;
  collections: CollectionItem[];
  onUploadSuccess?: () => Promise<void> | void;
  isLoading?: boolean;
}

export function TemplateUploadSheet({
  isOpen,
  onOpenChange,
  selectedCollection,
  onSelectCollection,
  collections,
  onUploadSuccess,
  isLoading = false,
}: TemplateUploadSheetProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [collectionName, setCollectionName] = useState('');

  const [previewCollection, setPreviewCollection] = useState<string | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoomedSlideIndex, setZoomedSlideIndex] = useState<number | null>(null);

  // TanStack Query for previews
  const { data: previewsData, isLoading: isLoadingPreviews } =
    useSlideTemplatePreviews(previewCollection, isPreviewOpen);
  const previews = previewsData || {};

  // TanStack Query mutation for uploads
  const importSlideTemplate = useImportSlideTemplate();
  const isUploading = importSlideTemplate.isPending;

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    const nameVal = collectionName.trim();
    importSlideTemplate.mutate(
      { file: uploadFile, name: nameVal || undefined },
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col border-slate-200 border-l bg-white text-slate-900 sm:max-w-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Presentation Templates Manager
            </SheetTitle>
            <SheetDescription className="mt-1 text-slate-500 text-xs dark:text-slate-400">
              Choose a visual style collection or upload a new template bank to
              customize slide renderings.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleUploadTemplate}
            className="mt-4 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden"
          >
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
              {/* Choose Template Style */}
              <div className="space-y-3">
                <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider dark:text-slate-400">
                  Choose Template Style
                </span>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <Spinner className="mr-2 h-6 w-6 text-primary" />
                    Loading template library...
                  </div>
                ) : collections.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 border-dashed p-4 text-center text-slate-500 text-xs dark:border-slate-800">
                    No styles found. Upload a PowerPoint deck below.
                  </div>
                ) : (
                  <div className="grid max-h-[260px] grid-cols-1 gap-2.5 overflow-y-auto pr-1">
                    {collections.map((col) => {
                      const isSelected = selectedCollection === col.name;
                      return (
                        <div
                          key={col.name}
                          className={cn(
                            'group relative flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectCollection(col.name)}
                            className="min-w-0 flex-1 py-1 pr-2 text-left"
                          >
                            <h4 className="truncate font-semibold text-slate-800 text-sm dark:text-slate-200">
                              {col.name === 'starter'
                                ? 'Default Starter'
                                : col.name === 'neon_dark'
                                  ? 'Neon Dark Theme'
                                  : col.name}
                            </h4>
                            {col.description && (
                              <p className="mt-0.5 truncate pr-2 text-slate-500 text-xs">
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
                                    className="h-2.5 w-2.5 rounded-full border border-white dark:border-slate-900"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200/50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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

              <div className="my-1 h-px shrink-0 bg-slate-200 dark:bg-slate-800" />

              {/* Upload Area */}
              <div className="space-y-4">
                <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider dark:text-slate-400">
                  Or Upload New Template Bank
                </span>

                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-500 text-xs dark:text-slate-400">
                    Collection Name (optional)
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g. Minimalist Dark"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-slate-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-500 text-xs dark:text-slate-400">
                    PPTX, ZIP or SVG File
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
                    maxSize={50 * 1024 * 1024} // 50MB
                    disabled={isUploading}
                    className="border-2 border-slate-200 border-dashed bg-slate-50/50 focus-within:ring-primary hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <DropzoneContent />
                    <DropzoneEmptyState />
                  </Dropzone>
                </div>
              </div>
            </div>

            <div className="mt-auto flex shrink-0 items-center justify-end gap-3 border-slate-200 border-t pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  setUploadFile(null);
                  setCollectionName('');
                }}
                disabled={isUploading}
                className="rounded-xl font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
        </SheetContent>
      </Sheet>

      {/* Larger Canva-like Slide Previews Pop-up Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="flex max-h-[85vh] w-full flex-col rounded-2xl border border-slate-200 bg-white p-6 sm:max-w-5xl dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-800 capitalize dark:text-slate-100">
              Style Preview:{' '}
              {previewCollection === 'starter'
                ? 'Default Starter'
                : previewCollection === 'neon_dark'
                  ? 'Neon Dark Theme'
                  : previewCollection}
            </DialogTitle>
          </DialogHeader>

          {isLoadingPreviews ? (
            <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center text-slate-500 text-sm">
              <Spinner className="mb-2 h-8 w-8 text-primary" />
              Loading preview slides...
            </div>
          ) : Object.keys(previews).length === 0 ? (
            <div className="flex min-h-[400px] flex-1 items-center justify-center text-slate-400 text-xs">
              No preview slides found for this template style.
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto py-2 pr-1 md:grid-cols-2">
              {Object.entries(previews).map(([name, svgContent], idx) => {
                const cleanedSvg = getCleanedPreviewSvg(svgContent);
                return (
                  <div key={name} className="flex flex-col space-y-1.5">
                    <span className="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                      {name.replace(/_/g, ' ')} Slide
                    </span>
                    <div
                      className="group flex aspect-[16/9] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700"
                      onClick={() => setZoomedSlideIndex(idx)}
                      dangerouslySetInnerHTML={{ __html: cleanedSvg }}
                    />
                  </div>
                );
              })}
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
        <DialogContent className="flex aspect-[16/9] w-[95vw] flex-col items-center justify-center overflow-hidden rounded-2xl border-none bg-slate-900 p-2 sm:max-w-[85vw] sm:rounded-2xl dark:bg-slate-950">
          {zoomedSlideIndex !== null && (
            <div className="group/lightbox relative flex h-full w-full flex-col">
              {/* Slide name overlay */}
              <div className="absolute top-4 left-4 z-10 rounded-full bg-slate-800/80 px-4 py-1.5 font-semibold text-slate-100 text-xs uppercase tracking-wider backdrop-blur-sm">
                {Object.keys(previews)[zoomedSlideIndex].replace(/_/g, ' ')}{' '}
                Slide
              </div>

              {/* Render cleaned SVG preview */}
              <div
                className="flex h-full w-full items-center justify-center bg-slate-900 p-2 dark:bg-slate-950"
                dangerouslySetInnerHTML={{
                  __html: getCleanedPreviewSvg(
                    Object.values(previews)[zoomedSlideIndex]
                  ),
                }}
              />

              {/* Navigation Left Arrow */}
              {zoomedSlideIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 left-4 h-12 w-12 -translate-y-1/2 rounded-full bg-slate-800/60 text-white opacity-60 backdrop-blur-sm transition-all hover:bg-slate-850 hover:text-white hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedSlideIndex(zoomedSlideIndex - 1);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Navigation Right Arrow */}
              {zoomedSlideIndex < Object.keys(previews).length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-4 h-12 w-12 -translate-y-1/2 rounded-full bg-slate-800/60 text-white opacity-60 backdrop-blur-sm transition-all hover:bg-slate-850 hover:text-white hover:opacity-100"
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
