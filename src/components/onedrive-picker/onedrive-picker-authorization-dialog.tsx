'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';

export function OneDrivePickerAuthorizationDialog({
  isOpen,
  onAuthorize,
  onDismiss,
}: {
  isOpen: boolean;
  onAuthorize: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations('OneDrivePickerAuthorization');

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onDismiss}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={onAuthorize}>
            <ExternalLink data-icon="inline-start" />
            {t('authorize')}
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground text-sm">{t('detail')}</p>
    </DialogTemplate>
  );
}
