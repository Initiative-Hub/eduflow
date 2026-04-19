import { Loader2, UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DialogTemplate } from '../dialog';
import type { AvatarTemplateProps } from './avatar.types';
import { useAvatar } from './use-avatar';

export function AvatarTemplate({
  avatarUrl,
  fallback = 'JD',
  onAvatarChange,
}: AvatarTemplateProps) {
  const t = useTranslations('ProfilePage');
  const {
    committedAvatarUrl,
    draftAvatarUrl,
    hasPendingChanges,
    isModalOpen,
    isSaving,
    maxFileSizeBytes,
    allowedContentTypes,
    handleOpenModal,
    handleFileSelect,
    handleDialogChange,
    handleSaveAvatar,
  } = useAvatar({
    initialAvatarUrl: avatarUrl ?? null,
    onAvatarChange,
  });

  const activeAvatarUrl = committedAvatarUrl || undefined;

  return (
    <>
      <div className="group relative">
        <Avatar className="h-24 w-24 border border-foreground md:h-40 md:w-40 lg:h-52 lg:w-52">
          <AvatarImage
            src={activeAvatarUrl}
            alt="user-avatar"
            className="h-full w-full rounded-full object-cover"
          />
          <AvatarFallback className="font-semibold text-base md:text-4xl">
            {fallback}
          </AvatarFallback>

          <div
            className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-center opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleOpenModal}
          >
            <span className="px-1 text-white text-xs sm:text-sm md:text-lg">
              {t('avatar.edit')}
            </span>
          </div>
        </Avatar>
      </div>

      <DialogTemplate
        isOpen={isModalOpen}
        onOpenChange={handleDialogChange}
        title={t('avatar.title')}
        description={t('avatar.description')}
        className="w-full max-w-md rounded-xl"
      >
        <div className="grid gap-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32 overflow-visible text-3xl">
              <AvatarImage
                src={draftAvatarUrl || undefined}
                alt="avatar-preview"
                className="rounded-full object-cover"
              />
              <AvatarFallback className="font-semibold">
                {fallback || <UserIcon className="size-10" />}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div>
              <Label
                htmlFor="avatar-upload"
                className="inline-block cursor-pointer rounded-md border px-4 py-2 text-center text-sm"
              >
                {draftAvatarUrl ? t('avatar.new') : t('avatar.upload')}
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept={allowedContentTypes.join(',')}
                disabled={isSaving}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || isSaving) {
                    return;
                  }

                  const result = handleFileSelect(file);
                  if (result !== 'ok') {
                    toast.error(t('avatar.fileValidationError'), {
                      description: t('avatar.fileValidationError', {
                        maxFileSize: maxFileSizeBytes / (1024 * 1024),
                      }),
                    });
                  }

                  event.target.value = '';
                }}
              />
            </div>

            {draftAvatarUrl && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  try {
                    await handleSaveAvatar('remove');
                    toast.success(t('avatar.saved'));
                  } catch {
                    toast.error(t('avatar.saveError'));
                  }
                }}
                disabled={isSaving}
              >
                {t('avatar.remove')}
              </Button>
            )}

            <Button
              type="button"
              onClick={async () => {
                try {
                  await handleSaveAvatar();
                  toast.success(t('avatar.saved'));
                } catch {
                  toast.error(t('avatar.saveError'));
                }
              }}
              disabled={!hasPendingChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t('avatar.save')
              )}
            </Button>
          </div>
        </div>
      </DialogTemplate>
    </>
  );
}
