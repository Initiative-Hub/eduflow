'use client';

import { Infinity as InfinityIcon, Plus, Search, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteLinksTable } from './invite-links-table';
import { MemberDialogs } from './member-dialogs';
import { MembersTable } from './members-table';
import { useMembers } from './use-members';

type MembersClientProps = {
  courseId: string;
  canManageMembers: boolean;
};

export function MembersClient({
  courseId,
  canManageMembers,
}: MembersClientProps) {
  const membersState = useMembers({
    courseId,
    initialCanManageMembers: canManageMembers,
  });
  const {
    t,
    search,
    roleFilter,
    itemsPerPage,
    roleOptions,
    pageSizeOptions,
    safeCurrentPage,
    totalPages,
    totalMembers,
    visibleStart,
    visibleEnd,
    isError,
    canManageMembers: canManage,
    capacity,
    getRoleLabel,
    handleSearchChange,
    handleRoleFilterChange,
    handleItemsPerPageChange,
    handlePreviousPage,
    handleNextPage,
    setAddDialogOpen,
  } = membersState;

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card className="border-border/70 bg-card/90 p-0 shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-border/60 border-b px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-xl">
                {t('title')}
              </CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-44 rounded-lg border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {t('capacity.label')}
                  </span>
                  <Badge variant={capacity.isFull ? 'destructive' : 'outline'}>
                    {capacity.capacity === null ? (
                      <InfinityIcon data-icon="inline-start" />
                    ) : (
                      <Users data-icon="inline-start" />
                    )}
                    {capacity.capacity === null
                      ? t('capacity.unlimited')
                      : t('capacity.value', {
                          active: capacity.activeMemberCount,
                          capacity: capacity.capacity,
                        })}
                  </Badge>
                </div>
                {capacity.capacity !== null ? (
                  <Progress
                    className="mt-2"
                    value={Math.min(
                      100,
                      Math.round(
                        (capacity.activeMemberCount / capacity.capacity) * 100
                      )
                    )}
                  />
                ) : null}
              </div>
              {canManage && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus data-icon="inline-start" />
                  {t('actions.addMember')}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5 p-6">
            {capacity.isFull ? (
              <Alert variant="destructive">
                <AlertTitle>{t('capacity.fullTitle')}</AlertTitle>
                <AlertDescription>
                  {t('capacity.fullDescription')}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <InputGroup className="h-10 w-full lg:max-w-md">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={search}
                  aria-label={t('searchLabel')}
                  placeholder={t('searchPlaceholder')}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </InputGroup>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={handleRoleFilterChange}
                >
                  <SelectTrigger aria-label={t('filters.role')}>
                    <SelectValue placeholder={t('filters.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ALL">{getRoleLabel('ALL')}</SelectItem>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger aria-label={t('pagination.itemsPerPage')}>
                    <SelectValue placeholder={t('pagination.itemsPerPage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {pageSizeOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t('pagination.perPage', { count: Number(value) })}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isError ? (
              <Alert variant="destructive">
                <AlertTitle>{t('errors.title')}</AlertTitle>
                <AlertDescription>{t('errors.description')}</AlertDescription>
              </Alert>
            ) : (
              <MembersTable membersState={membersState} />
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-border/60 border-t px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-muted-foreground text-sm">
              {t('pagination.range', {
                start: visibleStart,
                end: visibleEnd,
                total: totalMembers,
              })}
            </p>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-fit">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t('pagination.previous')}
                      onClick={(event) => {
                        event.preventDefault();
                        handlePreviousPage();
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <Badge variant="outline" className="h-8 px-3">
                      {t('pagination.page', {
                        page: safeCurrentPage,
                        total: totalPages,
                      })}
                    </Badge>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t('pagination.next')}
                      onClick={(event) => {
                        event.preventDefault();
                        handleNextPage();
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardFooter>
        </Card>
        {canManage && <InviteLinksTable membersState={membersState} />}
      </div>
      <MemberDialogs membersState={membersState} />
    </>
  );
}
