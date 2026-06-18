import { ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  StudyQuizOptions,
  StudyQuizQuestionType,
} from '@/lib/validations/study.schema';

const QUESTION_TYPES: StudyQuizQuestionType[] = [
  'multiple_choice',
  'true_false',
  'fill_in_the_blank',
];

export function StudyQuizOptionsPanel({
  options,
  onOptionsChange,
}: {
  options: StudyQuizOptions;
  onOptionsChange: (option: StudyQuizOptions) => void;
}) {
  const t = useTranslations('StudyPage.quizOptions');

  return (
    <FieldSet className="rounded-lg border border-border bg-card p-4">
      <FieldLegend>{t('title')}</FieldLegend>
      <FieldDescription>{t('description')}</FieldDescription>

      <FieldGroup>
        <Field>
          <FieldLabel>{t('questionTypes')}</FieldLabel>
          <ToggleGroup
            type="multiple"
            variant="outline"
            className="flex w-full flex-wrap gap-2"
            value={options.questionTypes}
            onValueChange={(value) => {
              if (value.length === 0) return;
              onOptionsChange({
                ...options,
                questionTypes: value as StudyQuizQuestionType[],
              });
            }}
          >
            {QUESTION_TYPES.map((type) => (
              <ToggleGroupItem key={type} value={type}>
                <ListChecks data-icon="inline-start" />
                {t(`types.${type}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="study-question-count">
            {t('questionCount')}
          </FieldLabel>
          <Input
            id="study-question-count"
            type="number"
            min={1}
            max={30}
            value={options.questionCount}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isNaN(next)) return;
              onOptionsChange({
                ...options,
                questionCount: Math.min(30, Math.max(1, next)),
              });
            }}
          />
          <FieldDescription>{t('questionCountDescription')}</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
