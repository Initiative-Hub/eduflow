'use client';

import { Edit2, MoreVertical, Plus, Search, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUsers } from './use-users';

export default function AdminUsersClient() {
  const {
    t,
    roleOptions,
    pageSizeOptions,
    query,
    roleFilter,
    itemsPerPage,
    editingId,
    editForm,
    addDialogOpen,
    newUserForm,
    addError,
    isLoading,
    isError,
    isCreating,
    isUpdating,
    filteredUsers,
    paginatedUsers,
    totalPages,
    safeCurrentPage,
    visibleStart,
    visibleEnd,
    getInitials,
    getRoleBadge,
    getStatusBadge,
    getJoinDate,
    openAddDialog,
    handleAddDialogOpenChange,
    handleQueryChange,
    handleRoleFilterChange,
    handleItemsPerPageChange,
    handlePreviousPage,
    handleNextPage,
    updateNewUserForm,
    updateEditForm,
    startEdit,
    cancelEdit,
    saveEdit,
    createUser,
  } = useUsers();

  return (
    <>
      <Card className="border-border/70 bg-card/90 p-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-border/60 border-b px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl">{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus data-icon="inline-start" />
            {t('actions.addUser')}
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger aria-label={t('filters.role')}>
                  <SelectValue placeholder={t('filters.role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('roles.all')}</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role.toLowerCase()}`)}
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
          ) : isLoading ? (
            <UsersTableSkeleton />
          ) : filteredUsers.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserRound />
                </EmptyMedia>
                <EmptyTitle>{t('empty.title')}</EmptyTitle>
                <EmptyDescription>{t('empty.description')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t('table.user')}</TableHead>
                    <TableHead>{t('table.role')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.joinDate')}</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">{t('table.actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const isEditing = editingId === user.id;
                    const badge = getRoleBadge(user.role);
                    const statusBadge = getStatusBadge(user.emailVerified);

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar size="lg">
                              <AvatarFallback>
                                {getInitials(user.name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <Input
                                  value={editForm.name}
                                  onChange={(event) =>
                                    updateEditForm('name', event.target.value)
                                  }
                                  aria-label={t('form.name')}
                                  className="h-8"
                                />
                              ) : (
                                <div className="truncate font-medium">
                                  {user.name || t('fallback.noName')}
                                </div>
                              )}
                              <div className="truncate text-muted-foreground text-sm">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editForm.role}
                              onValueChange={(value) =>
                                updateEditForm('role', value)
                              }
                            >
                              <SelectTrigger
                                size="sm"
                                aria-label={t('form.role')}
                              >
                                <SelectValue placeholder={t('form.role')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {roleOptions.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {t(`roles.${role.toLowerCase()}`)}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getJoinDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={isUpdating}
                              >
                                {t('actions.save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={isUpdating}
                              >
                                {t('actions.cancel')}
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreVertical />
                                  <span className="sr-only">
                                    {t('table.actions')}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => startEdit(user)}
                                    className="cursor-pointer gap-2"
                                  >
                                    <Edit2 />
                                    {t('actions.edit')}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-border/60 border-t px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-muted-foreground text-sm">
            {t('pagination.range', {
              start: visibleStart,
              end: visibleEnd,
              total: filteredUsers.length,
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

      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addDialog.title')}</DialogTitle>
            <DialogDescription>{t('addDialog.description')}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            {addError && (
              <Field data-invalid>
                <FieldError>{addError}</FieldError>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="admin-user-email">
                {t('form.email')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="admin-user-email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(event) =>
                    updateNewUserForm('email', event.target.value)
                  }
                  placeholder={t('form.emailPlaceholder')}
                  aria-invalid={Boolean(addError && !newUserForm.email)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-password">
                {t('form.password')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="admin-user-password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) =>
                    updateNewUserForm('password', event.target.value)
                  }
                  placeholder={t('form.passwordPlaceholder')}
                  aria-invalid={Boolean(addError && !newUserForm.password)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-name">
                {t('form.nameOptional')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="admin-user-name"
                  value={newUserForm.name}
                  onChange={(event) =>
                    updateNewUserForm('name', event.target.value)
                  }
                  placeholder={t('form.namePlaceholder')}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-role">
                {t('form.role')}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={newUserForm.role}
                  onValueChange={(value) => updateNewUserForm('role', value)}
                >
                  <SelectTrigger id="admin-user-role">
                    <SelectValue placeholder={t('form.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`roles.${role.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isCreating}>
                {t('actions.cancel')}
              </Button>
            </DialogClose>
            <Button onClick={createUser} disabled={isCreating}>
              {isCreating ? t('actions.creating') : t('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsersTableSkeleton() {
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
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead />
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
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
