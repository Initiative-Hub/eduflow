'use client';

import {
  Archive,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Pencil,
  Save,
  Users,
  X,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
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
import {
  Field,
  FieldContent,
  FieldError,
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
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  COURSE_VISIBILITY_OPTIONS,
  type CourseSettingsResponse,
  type CourseVisibility,
} from './settings.config';
import { CourseSettingsDangerZone } from './settings-danger-zone';
import { useCourseSettings } from './use-settings';

type CourseSettingsClientProps = {
  courseId: string;
  initialSettings: CourseSettingsResponse;
};

export function CourseSettingsClient({
  courseId,
  initialSettings,
}: CourseSettingsClientProps) {
  const settingsState = useCourseSettings({ courseId, initialSettings });
  const {
    canSaveOverview,
    cancelEditing,
    capacityValidationMessage,
    draft,
    getCapacityLabel,
    getRoleLabel,
    getVisibilityLabel,
    isEditing,
    isError,
    isSavingOverview,
    saveOverview,
    settings,
    startEditing,
    t,
    updateDraft,
  } = settingsState;
  const visibility = settings.course.isPublished ? 'public' : 'private';
  const capacityLabel = getCapacityLabel(settings.course.capacity);
  const courseDescription =
    settings.course.description || t('fallback.noDescription');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveOverview();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/70 bg-card p-0 shadow-sm">
        <CardHeader className="border-border/60 border-b bg-muted/20 px-7 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-heading text-xl">
                  {t('title')}
                </CardTitle>
                {settings.course.archivedAt ? (
                  <Badge variant="destructive">
                    <Archive data-icon="inline-start" />
                    {t('status.archived')}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="max-w-2xl text-sm">
                {t('description')}
              </CardDescription>
            </div>
            {settings.currentUser.isOwner && !isEditing ? (
              <CardAction>
                <Button type="button" variant="outline" onClick={startEditing}>
                  <Pencil data-icon="inline-start" />
                  {t('actions.edit')}
                </Button>
              </CardAction>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-4">
          {isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t('errors.title')}</AlertTitle>
              <AlertDescription>{t('errors.description')}</AlertDescription>
            </Alert>
          ) : null}

          {settings.course.archivedAt ? (
            <Alert>
              <Archive />
              <AlertTitle>{t('archivedNotice.title')}</AlertTitle>
              <AlertDescription>
                {t('archivedNotice.description')}
              </AlertDescription>
            </Alert>
          ) : null}

          {isEditing ? (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="course-settings-title">
                    {t('form.title')}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="course-settings-title"
                      value={draft.title}
                      disabled={isSavingOverview}
                      onChange={(event) =>
                        updateDraft({ title: event.target.value })
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-settings-description">
                    {t('form.description')}
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="course-settings-description"
                      value={draft.description}
                      disabled={isSavingOverview}
                      rows={5}
                      onChange={(event) =>
                        updateDraft({ description: event.target.value })
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-settings-visibility">
                    {t('form.visibility')}
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      value={draft.visibility}
                      onValueChange={(value) =>
                        updateDraft({
                          visibility: value as CourseVisibility,
                        })
                      }
                      disabled={isSavingOverview}
                    >
                      <SelectTrigger id="course-settings-visibility">
                        <SelectValue placeholder={t('form.visibility')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {COURSE_VISIBILITY_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {getVisibilityLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="course-settings-capacity-mode">
                    {t('form.capacity')}
                  </FieldLabel>
                  <FieldContent>
                    <div className="flex flex-col gap-3">
                      <ToggleGroup
                        id="course-settings-capacity-mode"
                        type="single"
                        value={draft.capacityMode}
                        variant="outline"
                        onValueChange={(value) => {
                          if (!value) return;
                          updateDraft({
                            capacityMode: value as 'limited' | 'unlimited',
                          });
                        }}
                      >
                        <ToggleGroupItem value="unlimited">
                          <InfinityIcon data-icon="inline-start" />
                          {t('capacity.unlimited')}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="limited">
                          <Users data-icon="inline-start" />
                          {t('capacity.limited')}
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <div className="flex flex-col gap-1">
                        {draft.capacityMode === 'limited' ? (
                          <div className="max-w-48">
                            <Input
                              id="course-settings-capacity"
                              type="number"
                              min={settings.course.activeMemberCount}
                              step={1}
                              value={draft.capacity}
                              disabled={isSavingOverview}
                              aria-invalid={Boolean(capacityValidationMessage)}
                              onChange={(event) =>
                                updateDraft({ capacity: event.target.value })
                              }
                            />
                          </div>
                        ) : null}
                        <FieldError>{capacityValidationMessage}</FieldError>
                      </div>
                    </div>
                  </FieldContent>
                </Field>
              </FieldGroup>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingOverview}
                  onClick={cancelEditing}
                >
                  <X data-icon="inline-start" />
                  {t('actions.cancel')}
                </Button>
                <Button type="submit" disabled={!canSaveOverview}>
                  {isSavingOverview ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Save data-icon="inline-start" />
                  )}
                  {t('actions.save')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <section className="flex min-h-56 flex-col justify-between gap-8 rounded-lg bg-muted/30 p-6 ring-1 ring-border/60">
                <div className="flex flex-col gap-4">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {t('fields.title')}
                  </div>
                  <h2 className="text-pretty font-heading font-semibold text-3xl leading-tight">
                    {settings.course.title}
                  </h2>
                </div>
                <div className="flex max-w-3xl flex-col gap-2">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {t('fields.description')}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {courseDescription}
                  </p>
                </div>
              </section>

              <dl className="overflow-hidden rounded-lg border bg-background">
                <MetadataRow label={t('fields.visibility')}>
                  <Badge
                    variant={visibility === 'public' ? 'secondary' : 'outline'}
                  >
                    {visibility === 'public' ? (
                      <Eye data-icon="inline-start" />
                    ) : (
                      <EyeOff data-icon="inline-start" />
                    )}
                    {getVisibilityLabel(visibility)}
                  </Badge>
                </MetadataRow>
                <MetadataRow label={t('fields.role')}>
                  <Badge variant="outline">
                    {getRoleLabel(settings.currentUser.role)}
                  </Badge>
                </MetadataRow>
                <MetadataRow label={t('fields.capacity')}>
                  <Badge variant="secondary">
                    {settings.course.capacity === null ? (
                      <InfinityIcon data-icon="inline-start" />
                    ) : (
                      <Users data-icon="inline-start" />
                    )}
                    {capacityLabel}
                  </Badge>
                </MetadataRow>
                <MetadataRow label={t('fields.courseId')}>
                  <code className="break-all rounded bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
                    {settings.course.id}
                  </code>
                </MetadataRow>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <CourseSettingsDangerZone settingsState={settingsState} />
    </div>
  );
}

function MetadataRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-20 flex-col justify-center gap-2 border-border/60 border-b px-4 py-4 last:border-b-0">
      <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
