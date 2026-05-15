'use client';

import { BookOpen, Check, Layers, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import type { Module } from '@/app/[locale]/(dashboard)/courses/[courseId]/use-modules';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuestionSubType,
  type QuizCategory,
} from '@/lib/quiz-template';
import { useQuizFormState } from './hooks/use-quiz-form-state';
import { useQuizValidation } from './hooks/use-quiz-validation';

export interface QuizFormProps {
  /** Modules with lessons for the content source selection */
  modules: Module[];
  /** Available lessons (may be filtered by preselected module) */
  availableLessons: { id: string; title: string }[];
  /** Called when the form is submitted with valid data */
  onSubmit: (data: QuizFormSubmitData) => void;
  /** Whether the submit action is in progress */
  isSubmitting: boolean;
  /** Whether AI generation is in progress */
  isGeneratingQuestions?: boolean;
  /** Error from AI question generation */
  generateQuestionsError?: Error | null;
  /** Called when user clicks "Generate with AI" */
  onGenerateWithAI?: (params: {
    lessonIds: string[];
    category: QuizCategory;
    subType: QuestionSubType;
    count: number;
  }) => void;
  /** Use compact spacing for dialog mode */
  compact?: boolean;
  /** Hide the lesson selector (when lesson is pre-selected) */
  hideLessonSelector?: boolean;
  /** Pre-selected lesson ID */
  preselectedLessonId?: string;
  /** Module name to display in the lesson selector header (dialog mode) */
  moduleName?: string;
  /** Render custom footer — receives handleSubmit and handleGenerateWithAI */
  renderFooter?: (
    handleSubmit: () => void,
    handleGenerateWithAI: () => void
  ) => React.ReactNode;
  /** Expose submit handler to parent via ref callback */
  onSubmitReady?: (submit: () => void) => void;
}

export interface QuizFormSubmitData {
  title: string;
  description: string;
  category: QuizCategory;
  subType: QuestionSubType;
  deliveryMode: DeliveryMode;
  questionCount: number;
  selectedLessonIds: string[];
  contentSource: 'specific-lessons' | 'all-modules';
}

export function QuizForm({
  modules,
  availableLessons,
  onSubmit,
  isSubmitting,
  isGeneratingQuestions = false,
  generateQuestionsError,
  onGenerateWithAI,
  compact = false,
  hideLessonSelector = false,
  preselectedLessonId,
  moduleName,
  renderFooter,
  onSubmitReady,
}: QuizFormProps) {
  const t = useTranslations('Courses.CreateQuiz');

  const {
    formState,
    setTitle,
    setDescription,
    handleCategoryChange,
    setSubType,
    setDeliveryMode,
    setQuestionCount,
    setContentSource,
    toggleLessonSelection,
    selectAllLessons,
    deselectAllLessons,
    availableSubTypes,
  } = useQuizFormState({ preselectedLessonId });

  const { errors, validate } = useQuizValidation(formState);

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      title: formState.title.trim(),
      description: formState.description.trim(),
      category: formState.category as QuizCategory,
      subType: formState.subType as QuestionSubType,
      deliveryMode: formState.deliveryMode,
      questionCount: Number.parseInt(formState.questionCount, 10) || 1,
      selectedLessonIds: formState.selectedLessonIds,
      contentSource: formState.contentSource,
    });
  };

  const handleGenerateWithAI = () => {
    if (!formState.category || !formState.subType || !onGenerateWithAI) return;

    const lessonIdsForGeneration =
      formState.contentSource === 'all-modules'
        ? availableLessons.map((l) => l.id)
        : formState.selectedLessonIds;

    if (lessonIdsForGeneration.length === 0) return;

    onGenerateWithAI({
      lessonIds: lessonIdsForGeneration,
      category: formState.category as QuizCategory,
      subType: formState.subType as QuestionSubType,
      count: Number.parseInt(formState.questionCount, 10) || 5,
    });
  };

  // Expose submit handler to parent
  useEffect(() => {
    onSubmitReady?.(handleSubmit);
  });

  const spacing = compact ? 'space-y-4' : 'space-y-6';
  const idPrefix = compact ? 'dialog' : 'page';

  return (
    <div className={spacing}>
      {/* AI Question Generation Card */}
      {onGenerateWithAI && (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">{t('aiGenerate')}</h3>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('aiGenerateDescription')}
          </p>
        </div>
      )}

      {/* Content Source / Lesson Selection */}
      {!hideLessonSelector && (
        <LessonSelector
          modules={modules}
          availableLessons={availableLessons}
          contentSource={formState.contentSource}
          setContentSource={setContentSource}
          selectedLessonIds={formState.selectedLessonIds}
          toggleLessonSelection={toggleLessonSelection}
          selectAllLessons={() =>
            selectAllLessons(availableLessons.map((l) => l.id))
          }
          deselectAllLessons={deselectAllLessons}
          compact={compact}
          moduleName={moduleName}
          errors={errors}
        />
      )}

      {/* Quiz Title */}
      <div className="space-y-2">
        <Label htmlFor={`quiz-title-${idPrefix}`}>{t('quizTitle')}</Label>
        <Input
          id={`quiz-title-${idPrefix}`}
          value={formState.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('quizTitlePlaceholder')}
        />
        {errors.title && (
          <p className="text-destructive text-xs">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor={`quiz-description-${idPrefix}`}>
          {t('quizDescription')}
        </Label>
        <Textarea
          id={`quiz-description-${idPrefix}`}
          value={formState.description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('quizDescriptionPlaceholder')}
          rows={compact ? 2 : 3}
        />
      </div>

      {/* Category & Sub-Type */}
      {compact ? (
        <div className="grid grid-cols-2 gap-4">
          <CategorySelect
            category={formState.category}
            onCategoryChange={handleCategoryChange}
            errors={errors}
          />
          <SubTypeSelect
            subType={formState.subType}
            onSubTypeChange={(v) => setSubType(v as QuestionSubType)}
            availableSubTypes={availableSubTypes}
            disabled={!formState.category}
            errors={errors}
          />
        </div>
      ) : (
        <>
          <CategorySelect
            category={formState.category}
            onCategoryChange={handleCategoryChange}
            errors={errors}
          />
          <SubTypeSelect
            subType={formState.subType}
            onSubTypeChange={(v) => setSubType(v as QuestionSubType)}
            availableSubTypes={availableSubTypes}
            disabled={!formState.category}
            errors={errors}
          />
        </>
      )}

      {/* Delivery Mode and Question Count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('deliveryMode')}</Label>
          <Select
            value={formState.deliveryMode}
            onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DELIVERY_MODE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`question-count-${idPrefix}`}>
            {t('questionCount')}
          </Label>
          <Input
            id={`question-count-${idPrefix}`}
            type="number"
            min={1}
            className="w-24"
            value={formState.questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
          />
          {errors.questionCount && (
            <p className="text-destructive text-xs">{errors.questionCount}</p>
          )}
        </div>
      </div>

      {/* AI Generate Error */}
      {generateQuestionsError && (
        <p className="text-destructive text-xs">{t('aiGenerateError')}</p>
      )}

      {/* Footer (submit/cancel buttons) — skip when parent handles submit externally */}
      {!onSubmitReady &&
        (renderFooter ? (
          renderFooter(handleSubmit, handleGenerateWithAI)
        ) : (
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t('creating') : t('createQuiz')}
            </Button>
          </div>
        ))}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface LessonSelectorProps {
  modules: Module[];
  availableLessons: { id: string; title: string }[];
  contentSource: 'specific-lessons' | 'all-modules';
  setContentSource: (source: 'specific-lessons' | 'all-modules') => void;
  selectedLessonIds: string[];
  toggleLessonSelection: (lessonId: string) => void;
  selectAllLessons: () => void;
  deselectAllLessons: () => void;
  compact?: boolean;
  moduleName?: string;
  errors: Record<string, string>;
}

function LessonSelector({
  modules,
  availableLessons,
  contentSource,
  setContentSource,
  selectedLessonIds,
  toggleLessonSelection,
  selectAllLessons,
  deselectAllLessons,
  compact,
  moduleName,
  errors,
}: LessonSelectorProps) {
  const t = useTranslations('Courses.CreateQuiz');

  // Dialog mode: compact lesson list with master checkbox
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2.5">
            <Checkbox
              checked={
                availableLessons.length > 0 &&
                selectedLessonIds.length === availableLessons.length
                  ? true
                  : selectedLessonIds.length > 0
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  selectAllLessons();
                } else {
                  deselectAllLessons();
                }
              }}
            />
            <span className="font-medium text-foreground text-sm">
              {moduleName || t('selectLessons')}
            </span>
            {selectedLessonIds.length > 0 && (
              <span className="ml-auto text-muted-foreground text-xs">
                {t('lessonsSelected', { count: selectedLessonIds.length })}
              </span>
            )}
          </div>

          <div className="max-h-48 space-y-0.5 overflow-y-auto p-1.5">
            {availableLessons.map((lesson) => {
              const isSelected = selectedLessonIds.includes(lesson.id);
              return (
                <label
                  key={lesson.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleLessonSelection(lesson.id)}
                  />
                  <span className="text-sm">{lesson.title}</span>
                </label>
              );
            })}
            {availableLessons.length === 0 && (
              <p className="p-4 text-center text-muted-foreground text-sm italic">
                {t('noLessonsAvailable')}
              </p>
            )}
          </div>
        </div>

        {errors.lesson && (
          <p className="text-destructive text-xs">{errors.lesson}</p>
        )}
      </div>
    );
  }

  // Page mode: content source toggle + multi-lesson selection
  return (
    <div className="space-y-3">
      <Label>{t('contentSource')}</Label>
      <p className="text-muted-foreground text-xs">
        {t('contentSourceDescription')}
      </p>

      {/* Content source toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
            contentSource === 'specific-lessons'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:bg-muted/50'
          }`}
          onClick={() => setContentSource('specific-lessons')}
        >
          <BookOpen className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-sm">{t('contentSourceLessons')}</p>
            <p className="text-muted-foreground text-xs">
              {t('contentSourceLessonsHint')}
            </p>
          </div>
        </button>
        <button
          type="button"
          className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
            contentSource === 'all-modules'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:bg-muted/50'
          }`}
          onClick={() => setContentSource('all-modules')}
        >
          <Layers className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-sm">
              {t('contentSourceAllModules')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('contentSourceAllModulesHint')}
            </p>
          </div>
        </button>
      </div>

      {/* Multi-lesson selection */}
      {contentSource === 'specific-lessons' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('selectLessons')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAllLessons}
              >
                {t('selectAll')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={deselectAllLessons}
              >
                {t('deselectAll')}
              </Button>
            </div>
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
            {modules.map((mod) => (
              <div key={mod.id} className="space-y-1">
                <p className="px-2 pt-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {mod.title}
                </p>
                {mod.lessons.map((lesson) => {
                  const isSelected = selectedLessonIds.includes(lesson.id);
                  return (
                    <label
                      key={lesson.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleLessonSelection(lesson.id)}
                      />
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{lesson.title}</span>
                    </label>
                  );
                })}
              </div>
            ))}
            {availableLessons.length === 0 && (
              <p className="p-4 text-center text-muted-foreground text-sm italic">
                {t('noLessonsAvailable')}
              </p>
            )}
          </div>

          {selectedLessonIds.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t('lessonsSelected', { count: selectedLessonIds.length })}
            </p>
          )}

          {errors.lesson && (
            <p className="text-destructive text-xs">{errors.lesson}</p>
          )}
        </div>
      )}

      {/* All modules info */}
      {contentSource === 'all-modules' && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-muted-foreground text-sm">
            {t('allModulesSelected', {
              moduleCount: modules.length,
              lessonCount: availableLessons.length,
            })}
          </p>
        </div>
      )}
    </div>
  );
}

interface CategorySelectProps {
  category: QuizCategory | '';
  onCategoryChange: (value: QuizCategory) => void;
  errors: Record<string, string>;
}

function CategorySelect({
  category,
  onCategoryChange,
  errors,
}: CategorySelectProps) {
  const t = useTranslations('Courses.CreateQuiz');

  return (
    <div className="space-y-2">
      <Label>{t('category')}</Label>
      <Select
        value={category}
        onValueChange={(v) => onCategoryChange(v as QuizCategory)}
      >
        <SelectTrigger className="h-auto min-h-10 w-full py-2">
          <SelectValue placeholder={t('categoryPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(QUIZ_CATEGORIES).map(([key, meta]) => (
            <SelectItem key={key} value={key}>
              <div className="text-left">
                <div className="font-medium">{meta.label}</div>
                <div className="text-muted-foreground text-xs">
                  {meta.description}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.category && (
        <p className="text-destructive text-xs">{errors.category}</p>
      )}
    </div>
  );
}

interface SubTypeSelectProps {
  subType: QuestionSubType | '';
  onSubTypeChange: (value: string) => void;
  availableSubTypes: QuestionSubType[];
  disabled: boolean;
  errors: Record<string, string>;
}

function SubTypeSelect({
  subType,
  onSubTypeChange,
  availableSubTypes,
  disabled,
  errors,
}: SubTypeSelectProps) {
  const t = useTranslations('Courses.CreateQuiz');

  return (
    <div className="space-y-2">
      <Label>{t('subType')}</Label>
      <Select
        value={subType}
        onValueChange={onSubTypeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('subTypePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {availableSubTypes.map((st) => (
            <SelectItem key={st} value={st}>
              {QUESTION_SUB_TYPE_LABELS[st]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.subType && (
        <p className="text-destructive text-xs">{errors.subType}</p>
      )}
    </div>
  );
}
