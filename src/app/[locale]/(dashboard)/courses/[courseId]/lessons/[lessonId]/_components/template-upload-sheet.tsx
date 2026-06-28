'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ArrowRight, Plus } from 'lucide-react';

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
  onUploadSuccess: () => Promise<void>;
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
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const nameVal = collectionName.trim();
      if (nameVal) {
        formData.append('name', nameVal);
      }
      const response = await fetch('/api/v1/ai/templates/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to import templates.');
      }

      const importedName =
        nameVal ||
        uploadFile.name.substring(0, uploadFile.name.lastIndexOf('.'));
      toast.success('Template collection uploaded and imported successfully!');
      setUploadFile(null);
      setCollectionName('');
      await onUploadSuccess();
      onSelectCollection(importedName);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import templates.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-slate-200 border-l bg-white text-slate-900 sm:max-w-md flex flex-col h-full dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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
          className="flex-1 flex flex-col overflow-hidden min-h-0 gap-6 mt-4"
        >
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1">
            {/* List of template collections */}
            <div className="space-y-3">
              <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider dark:text-slate-400">
                Choose Template Style
              </span>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Spinner className="h-6 w-6 text-primary mr-2" />
                  Loading template library...
                </div>
              ) : collections.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs dark:border-slate-800">
                  No styles found. Upload a PowerPoint deck below.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {collections.map((col) => {
                    const isSelected = selectedCollection === col.name;
                    return (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => onSelectCollection(col.name)}
                        className={cn(
                          'w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                        )}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                            {col.name === 'starter'
                              ? 'Default Starter'
                              : col.name === 'neon_dark'
                                ? 'Neon Dark Theme'
                                : col.name}
                          </h4>
                          {col.description && (
                            <p className="text-slate-500 text-xs truncate mt-0.5">
                              {col.description}
                            </p>
                          )}
                        </div>
                        {col.palette && col.palette.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {col.palette.slice(0, 4).map((color, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

            {/* Upload Area */}
            <div className="space-y-4">
              <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider dark:text-slate-400">
                Or Upload New Template Bank
              </span>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-450">
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
                <span className="text-xs text-slate-500 dark:text-slate-450">
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

          <div className="shrink-0 mt-auto flex items-center justify-end gap-3 border-slate-200 border-t pt-4 dark:border-slate-800">
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
  );
}
