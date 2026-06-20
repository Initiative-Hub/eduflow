import { ArrowLeftRight, ListChecks, PencilLine } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  StudyQuizOptions,
  StudyQuizQuestionType,
} from '@/lib/validations/study.schema';

const QUESTION_TYPES: {
  type: StudyQuizQuestionType;
  icon: typeof ListChecks;
}[] = [
  { type: 'multiple_choice', icon: ListChecks },
  { type: 'true_false', icon: ArrowLeftRight },
  { type: 'fill_in_the_blank', icon: PencilLine },
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
    <FieldSet className="rounded-xl border border-border/80 bg-card/95 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <FieldLegend className="mb-0 font-bold text-xl tracking-normal">
          {t('title')}
        </FieldLegend>
        <FieldDescription className="max-w-3xl text-sm">
          {t('description')}
        </FieldDescription>
      </div>

      <Separator />

      <FieldGroup className="gap-7">
        <Field>
          <FieldLabel className="font-bold text-sm">
            {t('questionTypes')}
          </FieldLabel>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="lg"
            spacing={2}
            className="flex w-full flex-wrap items-center gap-3"
            value={options.questionTypes}
            aria-label={t('questionTypes')}
            onValueChange={(value) => {
              if (value.length === 0) return;
              onOptionsChange({
                ...options,
                questionTypes: value as StudyQuizQuestionType[],
              });
            }}
          >
            {QUESTION_TYPES.map(({ type, icon: Icon }) => (
              <ToggleGroupItem
                key={type}
                value={type}
                className="cursor-pointer rounded-full px-5 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <Icon data-icon="inline-start" />
                {t(`types.${type}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field className="max-w-sm">
          <FieldLabel
            className="font-bold text-sm"
            htmlFor="study-question-count"
          >
            {t('questionCount')}
          </FieldLabel>
          <Input
            id="study-question-count"
            name="study-question-count"
            inputMode="numeric"
            autoComplete="off"
            type="number"
            min={1}
            max={30}
            className="h-10 border-transparent bg-muted/50 px-4 font-semibold shadow-none focus-visible:border-primary/40 focus-visible:bg-background"
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
          <FieldDescription className="text-xs">
            {t('questionCountDescription')}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
