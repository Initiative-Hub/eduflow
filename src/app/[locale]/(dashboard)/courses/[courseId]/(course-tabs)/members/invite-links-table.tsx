'use client';

import { Copy, Link, Link2Off, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UseMembersState } from './use-members';

type InviteLinksTableProps = {
  membersState: UseMembersState;
};

export function InviteLinksTable({ membersState }: InviteLinksTableProps) {
  const {
    t,
    getJoinDate,
    getRoleBadge,
    inviteLinks,
    isInviteLinksError,
    isInviteLinksLoading,
    isRevokingInviteLink,
    revokeInviteLink,
    setInviteLinkDialogOpen,
  } = membersState;

  return (
    <Card className="border-border/70 bg-card/90 p-0 shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-border/60 border-b px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="font-heading text-xl">
            {t('links.title')}
          </CardTitle>
          <CardDescription>{t('links.description')}</CardDescription>
        </div>
        <Button onClick={() => setInviteLinkDialogOpen(true)}>
          <Plus data-icon="inline-start" />
          {t('actions.addInviteLink')}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {isInviteLinksError ? (
          <div className="rounded-lg border border-destructive/30 p-4 text-destructive text-sm">
            {t('links.error')}
          </div>
        ) : isInviteLinksLoading ? (
          <InviteLinksSkeleton />
        ) : inviteLinks.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link />
              </EmptyMedia>
              <EmptyTitle>{t('links.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('links.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t('links.table.link')}</TableHead>
                  <TableHead>{t('links.table.role')}</TableHead>
                  <TableHead>{t('links.table.usage')}</TableHead>
                  <TableHead>{t('links.table.expires')}</TableHead>
                  <TableHead>{t('links.table.status')}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t('table.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inviteLinks.map((inviteLink) => {
                  const roleBadge = getRoleBadge(inviteLink.role);
                  const revoked = Boolean(inviteLink.revokedAt);

                  return (
                    <TableRow key={inviteLink.id}>
                      <TableCell className="max-w-72 truncate font-mono text-xs">
                        {inviteLink.url}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadge.variant}>
                          {roleBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inviteLink.maxUses
                          ? t('links.usageWithLimit', {
                              max: inviteLink.maxUses,
                              used: inviteLink.usedCount,
                            })
                          : t('links.usageUnlimited', {
                              used: inviteLink.usedCount,
                            })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inviteLink.expiresAt
                          ? getJoinDate(inviteLink.expiresAt)
                          : t('links.neverExpires')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={revoked ? 'destructive' : 'secondary'}>
                          {revoked
                            ? t('links.status.revoked')
                            : t('links.status.active')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={async () => {
                              await navigator.clipboard.writeText(
                                inviteLink.url
                              );
                              toast.success(t('toast.linkCopied'));
                            }}
                          >
                            <Copy />
                            <span className="sr-only">
                              {t('actions.copyLink')}
                            </span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                disabled={revoked || isRevokingInviteLink}
                              >
                                <Link2Off />
                                <span className="sr-only">
                                  {t('actions.revokeLink')}
                                </span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('links.revokeDialog.title')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('links.revokeDialog.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  disabled={isRevokingInviteLink}
                                >
                                  {t('actions.cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  disabled={isRevokingInviteLink}
                                  onClick={() =>
                                    revokeInviteLink(inviteLink.id)
                                  }
                                >
                                  <Link2Off data-icon="inline-start" />
                                  {t('actions.revokeLink')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteLinksSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-52" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-8 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
