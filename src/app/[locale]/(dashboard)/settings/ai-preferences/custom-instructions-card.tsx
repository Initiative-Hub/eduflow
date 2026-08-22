'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilSparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type FormFieldConfig, FormTemplate } from '@/components/custom/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type UpdateAiPreferencesInput,
  updateAiPreferencesSchema,
} from '@/lib/validations/ai-preferences.schema';
import {
  AI_PREFERENCES_QUERY_KEY,
  type AiPreferencesResponse,
  aiPreferencesService,
} from './ai-preferences.service';

const MAX_INSTRUCTIONS_LENGTH = 2000;

interface CustomInstructionsCardProps {
  initialValue: string;
}

const CustomInstructionsCard = ({
  initialValue,
}: CustomInstructionsCardProps) => {
  const t = useTranslations('ProfilePage.aiPreferences.customInstructions');
  const queryClient = useQueryClient();

  const form = useForm<UpdateAiPreferencesInput>({
    resolver: zodResolver(updateAiPreferencesSchema),
    defaultValues: {
      customInstructions: initialValue,
    },
    mode: 'onChange',
  });

  const fields = useMemo<FormFieldConfig[]>(
    () => [
      {
        name: 'customInstructions',
        type: 'textarea',
        label: t('label'),
        description: t('description'),
        placeholder: t('placeholder'),
        maxLength: MAX_INSTRUCTIONS_LENGTH,
        colSpan: 2,
      },
    ],
    [t]
  );

  const updateMutation = useMutation({
    mutationFn: aiPreferencesService.update,
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('saveFailed'));
    },
    onSuccess: (preferences: AiPreferencesResponse) => {
      const savedValue = preferences.customInstructions ?? '';

      queryClient.setQueryData(AI_PREFERENCES_QUERY_KEY, preferences);

      form.reset({
        customInstructions: savedValue,
      });

      toast.success(t('saved'));
    },
  });

  const value = form.watch('customInstructions') ?? '';

  const isSubmitDisabled =
    updateMutation.isPending ||
    !form.formState.isDirty ||
    !form.formState.isValid;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PencilSparkles className="size-4 text-primary" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('summary')}</CardDescription>
      </CardHeader>

      <CardContent>
        <FormTemplate
          form={form}
          schema={updateAiPreferencesSchema}
          defaultValues={{
            customInstructions: initialValue,
          }}
          fields={fields}
          onSubmit={(data) => updateMutation.mutate(data)}
          submitLabel={updateMutation.isPending ? t('saving') : t('save')}
          isLoading={isSubmitDisabled}
        >
          <div className="flex items-start justify-between gap-4 text-muted-foreground text-xs">
            <p>{t('priorityNote')}</p>
            <span className="shrink-0 tabular-nums">
              {t('characterCount', {
                count: value.length,
                max: MAX_INSTRUCTIONS_LENGTH,
              })}
            </span>
          </div>
        </FormTemplate>
      </CardContent>
    </Card>
  );
};
export default CustomInstructionsCard;
