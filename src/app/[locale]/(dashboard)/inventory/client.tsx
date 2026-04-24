'use client';
import {
  Download,
  Edit2,
  Eye,
  FileIcon,
  MoreVertical,
  Move,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StorageFile } from './storage-context';

interface FileCardProps {
  file: StorageFile;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string) => void;
  onMove: (fileId: string) => void;
  onShare: (fileId: string) => void;
  onPreview: (file: StorageFile) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onDelete,
  onRename,
  onMove,
  onShare,
  onPreview,
}) => {
  const isImage = file.type.startsWith('image/');

  const handleDownload = () => {
    if (file.data) {
      const blob = new Blob([file.data], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / k ** i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      {isImage && file.data && (
        <div
          className="mb-3 h-40 w-full cursor-pointer overflow-hidden rounded-md bg-muted"
          onClick={() => onPreview(file)}
        >
          <Image
            src={file.data}
            alt={file.name}
            width={500}
            height={500}
            unoptimized
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        </div>
      )}

      {!isImage && (
        <div className="mb-3 flex h-40 w-full items-center justify-center rounded-md bg-secondary">
          <div className="text-center">
            <div className="font-bold text-3xl text-primary">
              {file.name.split('.').pop()?.toUpperCase().slice(0, 2)}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {file.type.split('/').pop()?.toUpperCase()}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 truncate font-medium text-foreground text-sm">
            {file.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onRename(file.id)}
                className="cursor-pointer gap-2"
              >
                <Edit2 size={14} />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onMove(file.id)}
                className="cursor-pointer gap-2"
              >
                <Move size={14} />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onShare(file.id)}
                className="cursor-pointer gap-2"
              >
                <Share2 size={14} />
                Share
              </DropdownMenuItem>
              {isImage && (
                <DropdownMenuItem
                  onClick={() => onPreview(file)}
                  className="cursor-pointer gap-2"
                >
                  <Eye size={14} />
                  Preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDownload}
                className="cursor-pointer gap-2"
              >
                <Download size={14} />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(file.id)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 size={14} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-muted-foreground text-xs">
          {formatFileSize(file.size)}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatDate(file.createdAt)}
        </p>
      </div>
    </div>
  );
};

export const InventoryClient: React.FC = () => {
  const [files, setFiles] = useState<StorageFile[]>([
    {
      id: '1',
      name: 'Lecture_Notes.pdf',
      type: 'application/pdf',
      size: 2450000,
      folderId: 'root',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Project_Structure.png',
      type: 'image/png',
      size: 1200000,
      folderId: 'root',
      createdAt: new Date(),
      data: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=400&auto=format&fit=crop&q=60',
    },
    {
      id: '3',
      name: 'Research_Paper.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 850000,
      folderId: 'root',
      createdAt: new Date(),
    },
  ]);

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRename = (id: string) => {
    const newName = prompt('Enter new name:');
    if (newName) {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
      );
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-3xl tracking-tight">Inventory</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onDelete={handleDelete}
            onRename={handleRename}
            onMove={() => {}}
            onShare={() => {}}
            onPreview={() => {}}
          />
        ))}
      </div>

      {files.length === 0 && (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-lg">No files uploaded</h3>
          <p className="mt-2 mb-4 text-muted-foreground text-sm">
            Upload files to see them here.
          </p>
          <Button variant="outline">Upload your first file</Button>
        </div>
      )}
    </div>
  );
};
