'use client';

import {
  Archive,
  Crown,
  LogOut,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { getCourseSettingsInitials } from './settings.config';
import type { UseCourseSettingsState } from './use-settings';

type CourseSettingsDangerZoneProps = {
  settingsState: UseCourseSettingsState;
};

export function CourseSettingsDangerZone({
  settingsState,
}: CourseSettingsDangerZoneProps) {
  const { settings, t } = settingsState;
  const isOwner = settings.currentUser.isOwner;
  const isArchived = Boolean(settings.course.archivedAt);

  return (
    <>
      <Card className="border-destructive/30 bg-card p-0 shadow-sm">
        <CardHeader className="border-b bg-destructive/10 px-7 py-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-destructive/20 p-2 text-destructive">
              <ShieldAlert />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="font-heading text-xl">
                {t('dangerZone.title')}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm">
                {t('dangerZone.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-7">
          {isOwner ? (
            <>
              <DangerAction
                description={t('dangerZone.transfer.description')}
                icon={<Crown />}
                title={t('dangerZone.transfer.title')}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => settingsState.setTransferDialogOpen(true)}
                >
                  <Crown data-icon="inline-start" />
                  {t('actions.transfer')}
                </Button>
              </DangerAction>
              <DangerAction
                description={
                  isArchived
                    ? t('dangerZone.unarchive.description')
                    : t('dangerZone.archive.description')
                }
                icon={isArchived ? <RotateCcw /> : <Archive />}
                title={
                  isArchived
                    ? t('dangerZone.unarchive.title')
                    : t('dangerZone.archive.title')
                }
              >
                {isArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => settingsState.setUnarchiveDialogOpen(true)}
                  >
                    <RotateCcw data-icon="inline-start" />
                    {t('actions.unarchive')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={settingsState.openArchiveDialog}
                  >
                    <Archive data-icon="inline-start" />
                    {t('actions.archive')}
                  </Button>
                )}
              </DangerAction>
              <DangerAction
                description={t('dangerZone.delete.description')}
                icon={<Trash2 />}
                title={t('dangerZone.delete.title')}
              >
                <Button
                  type="button"
                  variant="destructive"
                  onClick={settingsState.openDeleteDialog}
                >
                  <Trash2 data-icon="inline-start" />
                  {t('actions.delete')}
                </Button>
              </DangerAction>
            </>
          ) : (
            <DangerAction
              description={t('dangerZone.leave.description')}
              icon={<LogOut />}
              title={t('dangerZone.leave.title')}
            >
              <Button
                type="button"
                variant="destructive"
                onClick={() => settingsState.setLeaveDialogOpen(true)}
              >
                <LogOut data-icon="inline-start" />
                {t('actions.leave')}
              </Button>
            </DangerAction>
          )}
        </CardContent>
      </Card>

      <TransferOwnershipDialog settingsState={settingsState} />
      <LeaveCourseDialog settingsState={settingsState} />
      <ArchiveCourseDialog settingsState={settingsState} />
      <UnarchiveCourseDialog settingsState={settingsState} />
      <DeleteCourseDialog settingsState={settingsState} />
    </>
  );
}

function DangerAction({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border bg-background p-5 transition-colors duration-200 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="rounded-md bg-muted p-2 text-muted-foreground">
          {icon}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="font-medium">{title}</div>
          <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}

function TransferOwnershipDialog({
  settingsState,
}: CourseSettingsDangerZoneProps) {
  const {
    getRoleLabel,
    isTransferring,
    selectedTransferMember,
    setTransferDialogOpen,
    setTransferMemberId,
    settings,
    t,
    transferDialogOpen,
    transferMemberId,
    transferOwnership,
  } = settingsState;
  const members = settings.transferMembers;

  return (
    <DialogTemplate
      isOpen={transferDialogOpen}
      onOpenChange={(open) => {
        if (isTransferring) return;
        setTransferDialogOpen(open);
        if (!open) {
          setTransferMemberId('');
        }
      }}
      title={t('transferDialog.title')}
      description={t('transferDialog.description')}
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isTransferring}
            onClick={() => setTransferDialogOpen(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!transferMemberId || isTransferring}
            onClick={() => transferOwnership()}
          >
            {isTransferring ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Crown data-icon="inline-start" />
            )}
            {t('actions.transfer')}
          </Button>
        </>
      }
    >
      {members.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRound />
            </EmptyMedia>
            <EmptyTitle>{t('transferDialog.emptyTitle')}</EmptyTitle>
            <EmptyDescription>
              {t('transferDialog.emptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="course-transfer-owner">
              {t('transferDialog.memberLabel')}
            </FieldLabel>
            <FieldContent>
              <Select
                value={transferMemberId}
                onValueChange={setTransferMemberId}
                disabled={isTransferring}
              >
                <SelectTrigger id="course-transfer-owner">
                  <SelectValue
                    placeholder={t('transferDialog.memberPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email} -{' '}
                        {getRoleLabel(member.role)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
          {selectedTransferMember ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  {selectedTransferMember.image ? (
                    <AvatarImage
                      src={selectedTransferMember.image}
                      alt={
                        selectedTransferMember.name ||
                        selectedTransferMember.email
                      }
                    />
                  ) : null}
                  <AvatarFallback>
                    {getCourseSettingsInitials(
                      selectedTransferMember.name,
                      selectedTransferMember.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium text-sm">
                    {selectedTransferMember.name || t('fallback.noName')}
                  </div>
                  <div className="truncate text-muted-foreground text-sm">
                    {selectedTransferMember.email}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {getRoleLabel(selectedTransferMember.role)}
              </Badge>
            </div>
          ) : null}
        </FieldGroup>
      )}
    </DialogTemplate>
  );
}

function LeaveCourseDialog({ settingsState }: CourseSettingsDangerZoneProps) {
  const { isLeaving, leaveCourse, leaveDialogOpen, setLeaveDialogOpen, t } =
    settingsState;

  return (
    <AlertDialog
      open={leaveDialogOpen}
      onOpenChange={(open) => !isLeaving && setLeaveDialogOpen(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <LogOut />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('leaveDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('leaveDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLeaving}>
            {t('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isLeaving}
            onClick={(event) => {
              event.preventDefault();
              leaveCourse();
            }}
          >
            {isLeaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LogOut data-icon="inline-start" />
            )}
            {t('actions.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchiveCourseDialog({ settingsState }: CourseSettingsDangerZoneProps) {
  const {
    archiveConfirmation,
    archiveCourse,
    archiveDialogOpen,
    canArchive,
    isArchiving,
    setArchiveConfirmation,
    setArchiveDialogOpen,
    settings,
    t,
  } = settingsState;

  return (
    <AlertDialog
      open={archiveDialogOpen}
      onOpenChange={(open) => !isArchiving && setArchiveDialogOpen(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Archive />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('archiveDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('archiveDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="course-archive-confirmation">
              {t('confirmation.label')}
            </FieldLabel>
            <FieldContent>
              <Input
                id="course-archive-confirmation"
                value={archiveConfirmation}
                disabled={isArchiving}
                placeholder={settings.course.id}
                onChange={(event) => setArchiveConfirmation(event.target.value)}
              />
              <FieldDescription>
                {t('confirmation.description', {
                  courseId: settings.course.id,
                })}
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>
            {t('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canArchive || isArchiving}
            onClick={(event) => {
              event.preventDefault();
              archiveCourse();
            }}
          >
            {isArchiving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Archive data-icon="inline-start" />
            )}
            {t('actions.archive')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UnarchiveCourseDialog({
  settingsState,
}: CourseSettingsDangerZoneProps) {
  const {
    isUnarchiving,
    setUnarchiveDialogOpen,
    t,
    unarchiveCourse,
    unarchiveDialogOpen,
  } = settingsState;

  return (
    <AlertDialog
      open={unarchiveDialogOpen}
      onOpenChange={(open) => !isUnarchiving && setUnarchiveDialogOpen(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RotateCcw />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('unarchiveDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('unarchiveDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUnarchiving}>
            {t('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isUnarchiving}
            onClick={(event) => {
              event.preventDefault();
              unarchiveCourse();
            }}
          >
            {isUnarchiving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RotateCcw data-icon="inline-start" />
            )}
            {t('actions.unarchive')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteCourseDialog({ settingsState }: CourseSettingsDangerZoneProps) {
  const {
    canDelete,
    deleteConfirmation,
    deleteCourse,
    deleteDialogOpen,
    isDeleting,
    setDeleteConfirmation,
    setDeleteDialogOpen,
    settings,
    t,
  } = settingsState;

  return (
    <AlertDialog
      open={deleteDialogOpen}
      onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="course-delete-confirmation">
              {t('confirmation.label')}
            </FieldLabel>
            <FieldContent>
              <Input
                id="course-delete-confirmation"
                value={deleteConfirmation}
                disabled={isDeleting}
                placeholder={settings.course.id}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
              <FieldDescription>
                {t('confirmation.description', {
                  courseId: settings.course.id,
                })}
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canDelete || isDeleting}
            onClick={(event) => {
              event.preventDefault();
              deleteCourse();
            }}
          >
            {isDeleting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            {t('actions.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
