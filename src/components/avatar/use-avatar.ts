import { useState } from "react";

interface UseAvatarProps {
  onUpload?: (file: File) => void | Promise<void>;
}

export const useAvatar = ({ onUpload }: UseAvatarProps = {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleFileDrop = (acceptedFiles: File[]) => {
    setSelectedFile(acceptedFiles);
  };

  const handleConfirmUpload = async () => {
    if (selectedFile.length > 0 && onUpload) {
      setIsUploading(true);
      try {
        await onUpload(selectedFile[0]);
        setIsModalOpen(false);
        setSelectedFile([]);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedFile([]);
    }
  };

  return {
    isModalOpen,
    isUploading,
    selectedFile,
    handleOpenModal,
    handleFileDrop,
    handleConfirmUpload,
    handleDialogChange,
  };
};
