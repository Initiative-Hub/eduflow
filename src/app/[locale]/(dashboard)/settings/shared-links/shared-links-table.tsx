'use client';

import {
  Clock3,
  Copy,
  ExternalLink,
  Link2Off,
  type LucideIcon,
  MessageSquareText,
  PanelsTopLeft,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SharedResourceLink } from '@/lib/api/ai-chat-share-client';
import { formatDateTime } from '@/utils/date';

type SharedLinksTableProps = {
  isRevoking: boolean;
  onCopy: (shareUrl: string) => Promise<void>;
  onRevoke: (shareId: string) => void;
  shares: SharedResourceLink[];
};

export function SharedLinksTable({
  isRevoking,
  onCopy,
  onRevoke,
  shares,
}: SharedLinksTableProps) {
  const t = useTranslations('AiShareLinks');
  const locale = useLocale();
  const [shareToRevoke, setShareToRevoke] = useState<SharedResourceLink | null>(
    null
  );
  const resourceTypes: Record<
    SharedResourceLink['resourceType'],
    { icon: LucideIcon; label: string }
  > = {
    AI_CHAT: {
      icon: MessageSquareText,
      label: t('types.aiChat'),
    },
    STUDY_INTERACTIVE_CONTENT: {
      icon: PanelsTopLeft,
      label: t('types.interactiveContent'),
    },
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-176">
          <TableHeader>
            <TableRow className="bg-muted/45 hover:bg-muted/45">
              <TableHead className="h-11 pl-5">
                {t('table.conversation')}
              </TableHead>
              <TableHead className="h-11">{t('table.type')}</TableHead>
              <TableHead className="h-11">{t('table.created')}</TableHead>
              <TableHead className="h-11 pr-5 text-right">
                <span className="sr-only">{t('table.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {shares.map((share) => {
              const resourceType = resourceTypes[share.resourceType];
              const ResourceIcon = resourceType.icon;

              return (
                <TableRow
                  className="group border-border/60 transition-colors hover:bg-muted/30"
                  key={share.id}
                >
                  <TableCell className="max-w-125 py-4 pl-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground">
                        <ResourceIcon className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <a
                          className="group/link inline-flex max-w-full items-center gap-1.5 truncate font-medium text-foreground transition-colors hover:text-primary"
                          href={share.shareUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="truncate">{share.title}</span>
                          <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
                        </a>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {share.shareUrl}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1.5" variant="outline">
                      <ResourceIcon data-icon="inline-start" />
                      {resourceType.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {formatDateTime(share.createdAt, locale)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        className="bg-background shadow-xs"
                        onClick={() => onCopy(share.shareUrl)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Copy data-icon="inline-start" />
                        {t('actions.copy')}
                      </Button>

                      <Button
                        disabled={isRevoking}
                        onClick={() => setShareToRevoke(share)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Link2Off />
                        <span className="sr-only">{t('actions.revoke')}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setShareToRevoke(null);
          }
        }}
        open={shareToRevoke !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRevoking}
              onClick={() => {
                if (shareToRevoke) {
                  onRevoke(shareToRevoke.id);
                }
              }}
              variant="destructive"
            >
              <Link2Off data-icon="inline-start" />
              {t('actions.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
