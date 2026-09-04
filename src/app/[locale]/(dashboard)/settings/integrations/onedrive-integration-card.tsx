'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Loader2,
  Unplug,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { OneDrivePickerAuthorizationDialog } from '@/components/onedrive-picker/onedrive-picker-authorization-dialog';
import { OneDrivePickerHost } from '@/components/onedrive-picker/onedrive-picker-host';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOneDrivePicker } from '@/hooks/use-onedrive-picker';
import { integrationsService } from './integrations.service';

const ONE_DRIVE_STATUS_QUERY_KEY = ['integrations', 'onedrive'] as const;

export function OneDriveIntegrationCard({ email }: { email: string }) {
  const t = useTranslations('IntegrationsPage');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const connectHref = `/api/v1/integrations/onedrive/connect?returnTo=/${locale}/settings/integrations`;

  const statusQuery = useQuery({
    queryKey: ONE_DRIVE_STATUS_QUERY_KEY,
    queryFn: integrationsService.getOneDriveStatus,
  });

  const disconnectMutation = useMutation({
    mutationFn: integrationsService.disconnectOneDrive,
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('toast.oneDriveDisconnectFailed'));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ONE_DRIVE_STATUS_QUERY_KEY,
      });
      toast.success(t('toast.oneDriveDisconnected'));
    },
  });

  const destinationMutation = useMutation({
    mutationFn: integrationsService.setOneDriveDestination,
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('toast.oneDriveDestinationFailed'));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ONE_DRIVE_STATUS_QUERY_KEY,
      });
      toast.success(t('toast.oneDriveDestinationSaved'));
    },
  });

  const oneDrivePicker = useOneDrivePicker({
    mode: 'folder',
    messages: {
      connectRequired: t('oneDrive.pickerConnectRequired'),
      sessionChanged: t('oneDrive.pickerSessionChanged'),
      tokenFailed: t('oneDrive.pickerTokenFailed'),
      unavailable: t('oneDrive.pickerUnavailable'),
    },
    onError: (message) => {
      toast.error(message);
    },
    onPicked: ([folder]) => {
      if (!folder) return;
      destinationMutation.mutate({
        driveId: folder.driveId,
        folderId: folder.itemId,
        kind: 'folder',
      });
    },
  });

  const status = statusQuery.data?.data;
  const isConnected = Boolean(status?.connected);
  const requiresReconnect = Boolean(status?.requiresReconnect);
  const canUseOneDrive = isConnected && !requiresReconnect;
  const isDestinationPending = destinationMutation.isPending;
  const destinationName =
    status?.destination?.name ?? t('oneDrive.noDestination');

  return (
    <Card>
      {oneDrivePicker.pickerProps && (
        <OneDrivePickerHost {...oneDrivePicker.pickerProps} />
      )}
      <OneDrivePickerAuthorizationDialog
        isOpen={oneDrivePicker.authorizationRequired}
        onAuthorize={oneDrivePicker.authorizePicker}
        onDismiss={oneDrivePicker.dismissAuthorization}
      />
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Cloud />
        </div>
        <CardTitle>{t('oneDrive.title')}</CardTitle>
        <CardDescription>{t('oneDrive.description')}</CardDescription>
        <CardAction>
          <Badge
            variant={
              canUseOneDrive && status?.setupComplete ? 'default' : 'outline'
            }
          >
            {requiresReconnect
              ? t('oneDrive.reconnectRequired')
              : canUseOneDrive && status?.setupComplete
                ? t('oneDrive.ready')
                : isConnected
                  ? t('oneDrive.exportSetupRequired')
                  : t('oneDrive.notConnected')}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">
                {t('oneDrive.eduflowAccount')}
              </div>
              <div className="mt-1 truncate font-medium">{email}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-muted-foreground text-xs">
                {t('oneDrive.driveAccount')}
              </div>
              <div className="mt-1 truncate font-medium">
                {status?.accountEmail ?? t('oneDrive.noAccount')}
              </div>
            </div>
          </div>
        )}

        {canUseOneDrive && (
          <div className="rounded-lg border bg-background p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {status?.destination?.kind === 'folder' ? (
                    <FolderOpen className="size-5" />
                  ) : (
                    <HardDrive className="size-5" />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="font-medium text-sm">
                    {status?.setupComplete
                      ? t('oneDrive.destinationReady')
                      : t('oneDrive.destinationRequired')}
                  </div>
                  {status?.destination?.webViewLink ? (
                    <a
                      className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
                      href={status.destination.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">{destinationName}</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  ) : (
                    <div className="truncate text-muted-foreground text-sm">
                      {destinationName}
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {t('oneDrive.destinationChangeNotice')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    destinationMutation.mutate({ kind: 'my_drive' })
                  }
                  disabled={isDestinationPending}
                >
                  {isDestinationPending ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <HardDrive data-icon="inline-start" />
                  )}
                  {t('oneDrive.useMyDrive')}
                </Button>
                <Button
                  type="button"
                  onClick={oneDrivePicker.openPicker}
                  disabled={isDestinationPending || oneDrivePicker.isLoading}
                >
                  {isDestinationPending || oneDrivePicker.isLoading ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <FolderOpen data-icon="inline-start" />
                  )}
                  {status?.destination
                    ? t('oneDrive.changeFolder')
                    : t('oneDrive.chooseDestination')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {requiresReconnect && (
          <div className="rounded-lg border bg-background p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Cloud />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">
                    {t('oneDrive.reconnectRequired')}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {t('oneDrive.reconnectDescription')}
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href={connectHref}>
                  <ExternalLink data-icon="inline-start" />
                  {t('oneDrive.reconnect')}
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {t('oneDrive.scope')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('oneDrive.accountNote')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isConnected && (
              <Button asChild>
                <Link href={connectHref}>
                  <ExternalLink data-icon="inline-start" />
                  {t('actions.connect')}
                </Link>
              </Button>
            )}
            {isConnected && (
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Unplug data-icon="inline-start" />
                )}
                {t('actions.disconnect')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
