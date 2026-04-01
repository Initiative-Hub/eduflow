import { Button } from '@base-ui/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { DialogTemplate } from '../dialog';
import { useAvatar } from './use-avatar';

const DEFAULT_AVATAR_PLACEHOLDER = './assets/avatar-placeholder.jpg';

interface AvatarTemplateProps {
  avatarUrl?: string;
  fallback?: string;
  onUpload?: (file: File) => void | Promise<void>;
}

export function AvatarTemplate({
  avatarUrl,
  fallback = 'JD',
  onUpload,
}: AvatarTemplateProps) {
  const displayAvatarUrl = avatarUrl || DEFAULT_AVATAR_PLACEHOLDER;
  const {
    isModalOpen,
    isUploading,
    selectedFile,
    handleOpenModal,
    handleFileDrop,
    handleConfirmUpload,
    handleDialogChange,
  } = useAvatar({ onUpload });

  return (
    <>
      <div className="group relative">
        <Avatar className="h-24 w-24 border-4 border-background md:h-40 md:w-40 lg:h-52 lg:w-52">
          <AvatarImage
            src={displayAvatarUrl}
            alt="user-avatar"
            className="h-full w-full rounded-full object-cover"
          />
          <AvatarFallback className="font-bold text-base md:text-4xl">
            {fallback}
          </AvatarFallback>

          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-center opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleOpenModal}
          >
            <span className="px-1 text-white text-xs sm:text-sm md:text-lg">
              Upload Image
            </span>
          </div>
        </Avatar>
      </div>

      <DialogTemplate
        isOpen={isModalOpen}
        onOpenChange={handleDialogChange}
        title="Upload Avatar"
        description="Choose a new avatar image to upload."
      >
        <div className="flex flex-col gap-4">
          <Dropzone
            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
            maxSize={5 * 1024 * 1024}
            maxFiles={1}
            src={selectedFile}
            onDrop={handleFileDrop}
          >
            <DropzoneContent />
            <DropzoneEmptyState />
          </Dropzone>

          <Button
            onClick={handleConfirmUpload}
            disabled={selectedFile.length === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>
        </div>
      </DialogTemplate>
    </>
  );
}
