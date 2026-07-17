'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
import { integrationsService } from './integrations.service';

const GOOGLE_DRIVE_STATUS_QUERY_KEY = ['integrations', 'google-drive'] as const;

export default function IntegrationsClient({
  eduflowAccountEmail,
}: {
  eduflowAccountEmail: string;
}) {
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

  const status = statusQuery.data?.data;
  const isConnected = Boolean(status?.connected);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
            <Badge variant={isConnected ? 'default' : 'outline'}>
              {isConnected
                ? t('googleDrive.connected')
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
                <div className="mt-1 truncate font-medium">
                  {eduflowAccountEmail}
                </div>
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
              <Button
                variant="outline"
                onClick={() => statusQuery.refetch()}
                disabled={statusQuery.isFetching}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={statusQuery.isFetching ? 'animate-spin' : ''}
                />
                {t('actions.refresh')}
              </Button>
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
