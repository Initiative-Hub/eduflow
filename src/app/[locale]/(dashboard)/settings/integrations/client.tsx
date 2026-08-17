'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Loader2,
  Unplug,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { GoogleDrivePickerHost } from '@/components/google-drive-picker/google-drive-picker-host';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useGoogleDrivePicker } from '@/hooks/use-google-drive-picker';
import { integrationsService } from './integrations.service';

const GOOGLE_DRIVE_STATUS_QUERY_KEY = ['integrations', 'google-drive'] as const;

export default function IntegrationsClient({ email }: { email: string }) {
  const t = useTranslations('IntegrationsPage');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const result = searchParams.get('googleDrive');
  const connectHref = `/api/v1/integrations/google-drive/connect?returnTo=/${locale}/settings/integrations`;

  const statusQuery = useQuery({
    queryKey: GOOGLE_DRIVE_STATUS_QUERY_KEY,
    queryFn: integrationsService.getGoogleDriveStatus,
  });

  const disconnectMutation = useMutation({
    mutationFn: integrationsService.disconnectGoogleDrive,
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('toast.disconnectFailed'));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GOOGLE_DRIVE_STATUS_QUERY_KEY,
      });
      toast.success(t('toast.disconnected'));
    },
  });

  const destinationMutation = useMutation({
    mutationFn: integrationsService.setGoogleDriveDestination,
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('toast.destinationFailed'));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GOOGLE_DRIVE_STATUS_QUERY_KEY,
      });
      toast.success(t('toast.destinationSaved'));
    },
  });

  const googleDrivePicker = useGoogleDrivePicker({
    mode: 'folder',
    messages: {
      connectRequired: t('googleDrive.pickerConnectRequired'),
      notConfigured: t('googleDrive.pickerUnavailable'),
      sessionChanged: t('googleDrive.pickerSessionChanged'),
      tokenFailed: t('googleDrive.pickerTokenFailed'),
      unavailable: t('googleDrive.pickerUnavailable'),
    },
    onError: (message) => {
      toast.error(message);
    },
    onPicked: ([folderId]) => {
      if (!folderId) return;
      destinationMutation.mutate({ kind: 'folder', folderId });
    },
  });

  const status = statusQuery.data?.data;
  const isConnected = Boolean(status?.connected);
  const isDestinationPending = destinationMutation.isPending;
  const destinationName =
    status?.destination?.name ?? t('googleDrive.noDestination');
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {googleDrivePicker.pickerProps && (
        <GoogleDrivePickerHost {...googleDrivePicker.pickerProps} />
      )}
      <div className="space-y-1">
        <h1 className="font-heading font-semibold text-2xl">{t('title')}</h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      {result === 'connected' && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>{t('notice.connectedTitle')}</AlertTitle>
          <AlertDescription>
            {t('notice.connectedDescription')}
          </AlertDescription>
        </Alert>
      )}
      {result === 'error' && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('notice.errorTitle')}</AlertTitle>
          <AlertDescription>{t('notice.errorDescription')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Cloud />
          </div>
          <CardTitle>{t('googleDrive.title')}</CardTitle>
          <CardDescription>{t('googleDrive.description')}</CardDescription>
          <CardAction>
            <Badge
              variant={
                isConnected && status?.setupComplete ? 'default' : 'outline'
              }
            >
              {isConnected && status?.setupComplete
                ? t('googleDrive.ready')
                : isConnected
                  ? t('googleDrive.exportSetupRequired')
                  : t('googleDrive.notConnected')}
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
                  {t('googleDrive.eduflowAccount')}
                </div>
                <div className="mt-1 truncate font-medium">{email}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-muted-foreground text-xs">
                  {t('googleDrive.driveAccount')}
                </div>
                <div className="mt-1 truncate font-medium">
                  {status?.accountEmail ?? t('googleDrive.noAccount')}
                </div>
              </div>
            </div>
          )}

          {isConnected && (
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
                        ? t('googleDrive.destinationReady')
                        : t('googleDrive.destinationRequired')}
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
                      {t('googleDrive.destinationChangeNotice')}
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
                    {t('googleDrive.useMyDrive')}
                  </Button>
                  <Button
                    type="button"
                    onClick={googleDrivePicker.openPicker}
                    disabled={
                      isDestinationPending ||
                      googleDrivePicker.isLoading ||
                      !googleDrivePicker.isConfigured
                    }
                  >
                    {isDestinationPending || googleDrivePicker.isLoading ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <FolderOpen data-icon="inline-start" />
                    )}
                    {status?.destination
                      ? t('googleDrive.changeFolder')
                      : t('googleDrive.chooseDestination')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {t('googleDrive.scope')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('googleDrive.accountNote')}
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
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
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
    </div>
  );
}
