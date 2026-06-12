'use client';

import { CloudUpload } from 'lucide-react';
import { useState } from 'react';
import { Dropzone } from '@/components/ui/dropzone';

export function StudyUploadZone() {
  const [files, setFiles] = useState<File[]>();

  return (
    <Dropzone
      src={files}
      maxFiles={10}
      accept={{
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          ['.docx'],
        'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      }}
      onDrop={(acceptedFiles) =>
        setFiles((prev) => [...(prev ?? []), ...acceptedFiles])
      }
      className="min-h-44 rounded-2xl"
    >
      {files && files.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
            <CloudUpload className="size-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-sm">
            {files.length === 1
              ? files[0].name
              : `${files.length} files selected`}
          </p>
          <p className="text-muted-foreground text-xs">
            Drag and drop or click to replace
          </p>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
            <CloudUpload className="size-5 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground text-lg">
            Upload Materials to Start
          </p>
          <p className="text-muted-foreground text-sm">
            Drag and drop PDF, Word, or Images here.
          </p>
        </div>
      )}
    </Dropzone>
  );
}
