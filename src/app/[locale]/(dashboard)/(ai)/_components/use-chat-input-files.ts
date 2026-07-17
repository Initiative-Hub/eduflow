'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '../../inventory/inventory.types';
import type { SelectedChatFile } from './chat-input-attachments';

interface UseChatInputFilesOptions {
  isAuthenticated: boolean;
  maxFiles: number;
  onFileTooLarge: (fileName: string) => void;
  onTooMany: () => void;
}

export function useChatInputFiles({
  isAuthenticated,
  maxFiles,
  onFileTooLarge,
  onTooMany,
}: UseChatInputFilesOptions) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedChatFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFilesRef = useRef<SelectedChatFile[]>([]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(
    () => () => {
      for (const item of selectedFilesRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    []
  );

  const clearSelectedFiles = () => {
    setSelectedFiles((current) => {
      for (const item of current) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles((current) => {
      const removed = current.find((item) => item.id === fileId);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((item) => item.id !== fileId);
    });
  };

  const addSelectedFiles = (files: FileList | File[]) => {
    if (!isAuthenticated) return;

    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    setSelectedFiles((current) => {
      const capacity = Math.max(0, maxFiles - current.length);
      if (incoming.length > capacity) {
        onTooMany();
      }

      const accepted = incoming.slice(0, capacity).flatMap((file) => {
        if (file.size > STORAGE_MAX_FILE_SIZE_BYTES) {
          onFileTooLarge(file.name);
          return [];
        }

        return [
          {
            file,
            filename: file.name,
            id: crypto.randomUUID(),
            mediaType: file.type || 'application/octet-stream',
            previewUrl: URL.createObjectURL(file),
          },
        ];
      });

      return [...current, ...accepted];
    });
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      addSelectedFiles(event.currentTarget.files);
    }
    event.currentTarget.value = '';
  };

  return {
    clearSelectedFiles,
    fileInputRef,
    handleFileInputChange,
    removeSelectedFile,
    selectedFiles,
  };
}
