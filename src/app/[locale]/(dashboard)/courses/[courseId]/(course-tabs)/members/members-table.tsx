'use client';

import { Edit2, MoreVertical, Trash2, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  type CourseMember,
  isCourseMemberRemovalLocked,
  isCourseMemberRoleLocked,
} from './members.config';
import type { UseMembersState } from './use-members';

type MembersTableProps = {
  membersState: UseMembersState;
};

export function MembersTable({ membersState }: MembersTableProps) {
  const {
    t,
    canManageMembers,
    getInitials,
    getJoinDate,
    getRoleBadge,
    isLoading,
    members: memberRows,
  } = membersState;

  if (isLoading) {
    return <MembersTableSkeleton canManageMembers={canManageMembers} />;
  }

  if (memberRows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRound />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>{t('table.user')}</TableHead>
            <TableHead>{t('table.role')}</TableHead>
            <TableHead>{t('table.joinDate')}</TableHead>
            {canManageMembers ? (
              <TableHead className="text-right">
                <span className="sr-only">{t('table.actions')}</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberRows.map((member) => {
            const roleBadge = getRoleBadge(member.user.role);

            return (
              <TableRow key={member.enrollmentId}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="lg">
                      {member.user.image ? (
                        <AvatarImage
                          src={member.user.image}
                          alt={member.user.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(member.user.name, member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {member.user.name || t('fallback.noName')}
                      </div>
                      <div className="truncate text-muted-foreground text-sm">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getJoinDate(member.enrolledAt)}
                </TableCell>
                {canManageMembers ? (
                  <TableCell className="text-right">
                    <MemberActions
                      member={member}
                      membersState={membersState}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function MemberActions({
  member,
  membersState,
}: {
  member: CourseMember;
  membersState: UseMembersState;
}) {
  const roleLocked = isCourseMemberRoleLocked(member);
  const removalLocked = isCourseMemberRemovalLocked(member);
  const { t, openEditDialog, setRemoveDialog } = membersState;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreVertical />
          <span className="sr-only">{t('table.actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={roleLocked}
            onSelect={() => openEditDialog(member)}
          >
            <Edit2 />
            {t('actions.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={removalLocked}
            variant="destructive"
            onSelect={() => setRemoveDialog(member)}
          >
            <Trash2 />
            {t('actions.remove')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MembersTableSkeleton({
  canManageMembers,
}: {
  canManageMembers: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            {canManageMembers ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              {canManageMembers ? (
                <TableCell className="text-right">
                  <Skeleton className="ml-auto size-8" />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
