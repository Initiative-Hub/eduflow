import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarChangePayload, UseAvatarProps } from './avatar.types';

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const useAvatar = ({
  initialAvatarUrl,
  onAvatarChange,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
}: UseAvatarProps = {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [committedAvatarUrl, setCommittedAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null
  );
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null
  );
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const committedObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const nextAvatar = initialAvatarUrl ?? null;
    if (
      committedObjectUrlRef.current &&
      committedObjectUrlRef.current !== nextAvatar
    ) {
      URL.revokeObjectURL(committedObjectUrlRef.current);
      committedObjectUrlRef.current = null;
    }

    setCommittedAvatarUrl(nextAvatar);
    setDraftAvatarUrl(nextAvatar);
    setDraftFile(null);
  }, [initialAvatarUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        if (previewObjectUrlRef.current !== committedObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        previewObjectUrlRef.current = null;
      }

      if (committedObjectUrlRef.current) {
        URL.revokeObjectURL(committedObjectUrlRef.current);
        committedObjectUrlRef.current = null;
      }
    };
  }, []);

  const hasPendingChanges = useMemo(() => {
    if (draftFile) {
      return true;
    }

    return draftAvatarUrl !== committedAvatarUrl;
  }, [draftAvatarUrl, committedAvatarUrl, draftFile]);

  const resetDraftToCommitted = useCallback(() => {
    if (previewObjectUrlRef.current) {
      if (previewObjectUrlRef.current !== committedObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = null;
    }

    setDraftFile(null);
    setDraftAvatarUrl(committedAvatarUrl);
  }, [committedAvatarUrl]);

  const handleOpenModal = useCallback(() => {
    setDraftAvatarUrl(committedAvatarUrl);
    setDraftFile(null);
    setIsModalOpen(true);
  }, [committedAvatarUrl]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsModalOpen(open);

      if (!open) {
        resetDraftToCommitted();
      }
    },
    [resetDraftToCommitted]
  );

  const emitAvatarChange = useCallback(
    async (payload: AvatarChangePayload) => {
      if (!onAvatarChange) {
        return;
      }

      await onAvatarChange(payload);
    },
    [onAvatarChange]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        return 'invalid_type' as const;
      }

      if (file.size > maxFileSizeBytes) {
        return 'invalid_size' as const;
      }

      if (previewObjectUrlRef.current) {
        if (previewObjectUrlRef.current !== committedObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        previewObjectUrlRef.current = null;
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      previewObjectUrlRef.current = nextPreviewUrl;
      setDraftFile(file);
      setDraftAvatarUrl(nextPreviewUrl);

      return 'ok' as const;
    },
    [maxFileSizeBytes]
  );

  const handleSaveAvatar = useCallback(
    async (modeOverride?: 'save' | 'remove') => {
      const mode = modeOverride ?? (draftAvatarUrl ? 'save' : 'remove');
      const nextDraftAvatarUrl = mode === 'remove' ? null : draftAvatarUrl;
      const nextDraftFile = mode === 'remove' ? null : draftFile;

      setIsSaving(true);
      try {
        await emitAvatarChange({
          file: nextDraftFile,
          previewUrl: nextDraftAvatarUrl,
          mode,
        });

        if (nextDraftFile && nextDraftAvatarUrl) {
          committedObjectUrlRef.current = nextDraftAvatarUrl;
        }

        if (!nextDraftAvatarUrl && committedObjectUrlRef.current) {
          URL.revokeObjectURL(committedObjectUrlRef.current);
          committedObjectUrlRef.current = null;
        }

        setCommittedAvatarUrl(nextDraftAvatarUrl);
        setDraftFile(null);
        setDraftAvatarUrl(nextDraftAvatarUrl);
        previewObjectUrlRef.current = null;
        setIsModalOpen(false);
      } finally {
        setIsSaving(false);
      }
    },
    [draftAvatarUrl, draftFile, emitAvatarChange]
  );

  return {
    committedAvatarUrl,
    draftAvatarUrl,
    draftFile,
    hasPendingChanges,
    isModalOpen,
    isSaving,
    maxFileSizeBytes,
    handleDialogChange,
    handleFileSelect,
    handleOpenModal,
    handleSaveAvatar,
  };
};
