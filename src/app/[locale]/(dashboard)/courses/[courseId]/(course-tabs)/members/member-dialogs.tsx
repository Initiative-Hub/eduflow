'use client';

import { format, isValid, parseISO } from 'date-fns';
import {
  CalendarIcon,
  Link,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { AssignableCourseMemberRole } from './members.config';
import type { UseMembersState } from './use-members';

type MemberDialogsProps = {
  membersState: UseMembersState;
};

export function MemberDialogs({ membersState }: MemberDialogsProps) {
  return (
    <>
      <EditMemberDialog membersState={membersState} />
      <RemoveMemberDialog membersState={membersState} />
      <AddMemberDialog membersState={membersState} />
      <CreateInviteLinkDialog membersState={membersState} />
    </>
  );
}

function EditMemberDialog({ membersState }: MemberDialogsProps) {
  const {
    t,
    editDialog,
    assignableRoles,
    getRoleLabel,
    isUpdating,
    saveEditRole,
    setEditDialog,
    updateEditRole,
  } = membersState;

  return (
    <DialogTemplate
      isOpen={Boolean(editDialog)}
      onOpenChange={(open) => !open && setEditDialog(null)}
      title={t('editDialog.title')}
      description={t('editDialog.description', {
        name:
          editDialog?.member.user.name || editDialog?.member.user.email || '',
      })}
      className="sm:max-w-md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isUpdating}
            onClick={() => setEditDialog(null)}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="button" disabled={isUpdating} onClick={saveEditRole}>
            {isUpdating ? <Spinner data-icon="inline-start" /> : null}
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="course-member-edit-role">
            {t('form.role')}
          </FieldLabel>
          <FieldContent>
            <Select
              value={editDialog?.role}
              onValueChange={updateEditRole}
              disabled={isUpdating}
            >
              <SelectTrigger id="course-member-edit-role">
                <SelectValue placeholder={t('form.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </FieldGroup>
    </DialogTemplate>
  );
}

function RemoveMemberDialog({ membersState }: MemberDialogsProps) {
  const { t, confirmRemoveMember, isRemoving, removeDialog, setRemoveDialog } =
    membersState;

  return (
    <AlertDialog
      open={Boolean(removeDialog)}
      onOpenChange={(open) => !open && setRemoveDialog(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('removeDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('removeDialog.description', {
              name: removeDialog?.user.name || removeDialog?.user.email || '',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>
            {t('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isRemoving}
            onClick={confirmRemoveMember}
          >
            {isRemoving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            {t('actions.remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddMemberDialog({ membersState }: MemberDialogsProps) {
  const {
    t,
    addDialogOpen,
    addMember,
    addPending,
    addRole,
    assignableRoles,
    candidateSearch,
    candidateSentinelRef,
    candidates,
    getInitials,
    getRoleLabel,
    handleAddDialogOpenChange,
    inviteMember,
    invitePending,
    isCandidatesError,
    isCandidatesLoading,
    isFetchingCandidatesNextPage,
    setAddRole,
    setCandidateSearch,
  } = membersState;

  return (
    <DialogTemplate
      isOpen={addDialogOpen}
      onOpenChange={handleAddDialogOpenChange}
      title={t('addDialog.title')}
      description={t('addDialog.description')}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="course-member-add-role">
              {t('form.role')}
            </FieldLabel>
            <FieldContent>
              <Select
                value={addRole}
                onValueChange={(value) =>
                  setAddRole(value as AssignableCourseMemberRole)
                }
              >
                <SelectTrigger id="course-member-add-role">
                  <SelectValue placeholder={t('form.role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="course-member-candidate-search">
              {t('searchLabel')}
            </FieldLabel>
            <FieldContent>
              <InputGroup className="h-10">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  id="course-member-candidate-search"
                  type="search"
                  value={candidateSearch}
                  placeholder={t('addDialog.searchPlaceholder')}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                />
              </InputGroup>
            </FieldContent>
          </Field>
        </FieldGroup>

        <ScrollArea className="h-88 rounded-lg border">
          <div className="flex flex-col gap-2 p-3">
            {isCandidatesError ? (
              <Alert variant="destructive">
                <AlertTitle>{t('errors.candidatesTitle')}</AlertTitle>
                <AlertDescription>
                  {t('errors.candidatesDescription')}
                </AlertDescription>
              </Alert>
            ) : isCandidatesLoading ? (
              <CandidateSkeleton />
            ) : candidates.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserRound />
                  </EmptyMedia>
                  <EmptyTitle>{t('addDialog.emptyTitle')}</EmptyTitle>
                  <EmptyDescription>
                    {t('addDialog.emptyDescription')}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      {candidate.image ? (
                        <AvatarImage
                          src={candidate.image}
                          alt={candidate.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(candidate.name, candidate.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">
                        {candidate.name || t('fallback.noName')}
                      </div>
                      <div className="truncate text-muted-foreground text-sm">
                        {candidate.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={invitePending || addPending}
                      onClick={() => inviteMember(candidate.id)}
                    >
                      {invitePending ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Send data-icon="inline-start" />
                      )}
                      {t('actions.invite')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={addPending || invitePending}
                      onClick={() => addMember(candidate.id)}
                    >
                      {addPending ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Plus data-icon="inline-start" />
                      )}
                      {t('actions.add')}
                    </Button>
                  </div>
                </div>
              ))
            )}
            <div ref={candidateSentinelRef} className="h-6" />
            {isFetchingCandidatesNextPage ? (
              <div className="flex justify-center py-2 text-muted-foreground text-sm">
                <Spinner data-icon="inline-start" />
                {t('addDialog.loadingMore')}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </DialogTemplate>
  );
}

function CreateInviteLinkDialog({ membersState }: MemberDialogsProps) {
  const {
    t,
    assignableRoles,
    createInviteLink,
    getRoleLabel,
    inviteLinkDialogOpen,
    inviteLinkForm,
    isCreatingInviteLink,
    setInviteLinkDialogOpen,
    updateInviteLinkForm,
  } = membersState;

  return (
    <DialogTemplate
      isOpen={inviteLinkDialogOpen}
      onOpenChange={setInviteLinkDialogOpen}
      title={t('linkDialog.title')}
      description={t('linkDialog.description')}
      className="sm:max-w-md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isCreatingInviteLink}
            onClick={() => setInviteLinkDialogOpen(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isCreatingInviteLink}
            onClick={() => createInviteLink()}
          >
            {isCreatingInviteLink ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Link data-icon="inline-start" />
            )}
            {t('actions.createLink')}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="course-invite-link-role">
            {t('form.role')}
          </FieldLabel>
          <FieldContent>
            <Select
              value={inviteLinkForm.role}
              onValueChange={(value) => updateInviteLinkForm('role', value)}
              disabled={isCreatingInviteLink}
            >
              <SelectTrigger id="course-invite-link-role">
                <SelectValue placeholder={t('form.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="course-invite-link-max-uses">
            {t('linkDialog.maxUses')}
          </FieldLabel>
          <FieldContent>
            <Input
              id="course-invite-link-max-uses"
              min={1}
              type="number"
              value={inviteLinkForm.maxUses}
              disabled={isCreatingInviteLink}
              onChange={(event) =>
                updateInviteLinkForm('maxUses', event.target.value)
              }
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="course-invite-link-expires-at-time">
            {t('linkDialog.expiresAt')}
          </FieldLabel>
          <FieldContent>
            <InviteLinkDateTimePicker
              value={inviteLinkForm.expiresAt}
              disabled={isCreatingInviteLink}
              onChange={(value) => updateInviteLinkForm('expiresAt', value)}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
    </DialogTemplate>
  );
}

type InviteLinkDateTimePickerProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function InviteLinkDateTimePicker({
  value,
  disabled,
  onChange,
}: InviteLinkDateTimePickerProps) {
  // Parse the stored string value into a Date
  const parsedDate = value ? parseISO(value) : undefined;
  const selectedDate =
    parsedDate && isValid(parsedDate) ? parsedDate : undefined;

  // Time string derived from the value (HH:mm)
  const timeValue = selectedDate ? format(selectedDate, 'HH:mm') : '';

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) return;
    // Preserve existing time or default to 00:00
    const [hours, minutes] = timeValue ? timeValue.split(':') : ['00', '00'];
    const merged = new Date(day);
    merged.setHours(Number(hours), Number(minutes), 0, 0);
    onChange(merged.toISOString());
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = event.target.value; // "HH:mm"
    if (!time) return;
    const base = selectedDate ?? new Date();
    const [hours, minutes] = time.split(':');
    const merged = new Date(base);
    merged.setHours(Number(hours), Number(minutes), 0, 0);
    onChange(merged.toISOString());
  };

  const handleClear = () => onChange('');

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="course-invite-link-expires-at-date"
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            {selectedDate ? (
              format(selectedDate, 'MMM d, yyyy')
            ) : (
              <span className="text-muted-foreground">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>

      <Input
        id="course-invite-link-expires-at-time"
        type="time"
        value={timeValue}
        disabled={disabled || !selectedDate}
        className="w-32 shrink-0"
        onChange={handleTimeChange}
      />

      {selectedDate && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleClear}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}

function CandidateSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
