'use client';

import { ArrowLeft, BookOpen, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
  SELECTION_METHOD_LABELS,
  type SelectionMethod,
} from '@/lib/quiz-template';
import { useCreateQuiz } from './use-create-quiz';

interface CreateQuizClientProps {
  courseId: string;
  preselectedModuleId?: string;
  /** When provided, the lesson is pre-selected and the selector is hidden */
  lessonId?: string;
}

export function CreateQuizClient({
  courseId,
  preselectedModuleId,
  lessonId,
}: CreateQuizClientProps) {
  const t = useTranslations('Courses.CreateQuiz');

  const {
    selectedLessonId,
    setSelectedLessonId,
    title,
    setTitle,
    description,
    setDescription,
    category,
    handleCategoryChange,
    subType,
    setSubType,
    deliveryMode,
    setDeliveryMode,
    selectionMethod,
    setSelectionMethod,
    questionCount,
    setQuestionCount,
    errors,
    availableLessons,
    availableSubTypes,
    matchingQuestionCount,
    handleSubmit,
    handleGenerateWithAI,
    isCreatingQuiz,
    isGeneratingQuestions,
  } = useCreateQuiz({ courseId, lessonId, preselectedModuleId });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Lesson Selection - only show if no lessonId is pre-provided */}
        {!lessonId && (
          <div className="space-y-2">
            <Label>{t('selectLesson')}</Label>
            <Select
              value={selectedLessonId}
              onValueChange={setSelectedLessonId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectLessonPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableLessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{lesson.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lesson && (
              <p className="text-destructive text-xs">{errors.lesson}</p>
            )}
          </div>
        )}

        {/* Quiz Title */}
        <div className="space-y-2">
          <Label htmlFor="quiz-title">{t('quizTitle')}</Label>
          <Input
            id="quiz-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('quizTitlePlaceholder')}
          />
          {errors.title && (
            <p className="text-destructive text-xs">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="quiz-description">{t('quizDescription')}</Label>
          <Textarea
            id="quiz-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('quizDescriptionPlaceholder')}
            rows={3}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>{t('category')}</Label>
          <Select
            value={category}
            onValueChange={(v) => handleCategoryChange(v as any)}
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

        {/* Sub-Type */}
        <div className="space-y-2">
          <Label>{t('subType')}</Label>
          <Select
            value={subType}
            onValueChange={(v) => setSubType(v as QuestionSubType)}
            disabled={!category}
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

        {/* Delivery Mode and Selection Method */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('deliveryMode')}</Label>
            <Select
              value={deliveryMode}
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
            <Label>{t('selectionMethod')}</Label>
            <Select
              value={selectionMethod}
              onValueChange={(v) => setSelectionMethod(v as SelectionMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SELECTION_METHOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Question Count */}
        <div className="space-y-2">
          <Label htmlFor="question-count">{t('questionCount')}</Label>
          <Input
            id="question-count"
            type="number"
            min={1}
            className="max-w-[200px]"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
          />
          {category && subType && (
            <p className="text-muted-foreground text-xs">
              {t('availableQuestions', { count: matchingQuestionCount })}
            </p>
          )}
          {errors.questionCount && (
            <p className="text-destructive text-xs">{errors.questionCount}</p>
          )}
        </div>

        {/* AI Generate Section */}
        {category && subType && selectedLessonId && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t('aiGenerate')}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingQuestions}
              >
                {isGeneratingQuestions ? (
                  <Sparkles className="mr-1 h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {isGeneratingQuestions
                  ? t('generatingQuestions')
                  : t('generate')}
              </Button>
            </div>
            <p className="mt-1.5 text-muted-foreground text-xs">
              {t('aiGenerateDescription')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Link href={`/courses/${courseId}`}>
            <Button variant="outline">{t('cancel')}</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isCreatingQuiz}>
            {isCreatingQuiz ? t('creating') : t('createQuiz')}
          </Button>
        </div>
      </div>
    </div>
  );
}
