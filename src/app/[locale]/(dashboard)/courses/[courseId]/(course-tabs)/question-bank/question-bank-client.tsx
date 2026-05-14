'use client';

import { BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuestionBankEntry,
} from '@/lib/quiz-template';
import { useModules } from '../../use-modules';
import {
  useQuestionBank,
  useQuestionBankFilters,
} from '../../use-question-bank';
import { QuestionBankFilters } from './question-bank-filters';
import { QuestionBankSearch } from './question-bank-search';
import { QuestionList } from './question-list';
import { QuestionPreview } from './question-preview';

interface QuestionBankClientProps {
  courseId: string;
}

export function QuestionBankClient({ courseId }: QuestionBankClientProps) {
  const t = useTranslations('Courses.QuestionBank');
  const { modules } = useModules(courseId);
  const { questions, isLoadingQuestions, deleteQuestion, isDeletingQuestion } =
    useQuestionBank({ courseId });
  const filters = useQuestionBankFilters(questions);

  const [previewQuestion, setPreviewQuestion] =
    useState<QuestionBankEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allLessons = modules.flatMap((m) => m.lessons);

  const getLessonTitle = (lessonId: string | null) => {
    if (!lessonId) return t('noLesson');
    const lesson = allLessons.find((l) => l.id === lessonId);
    return lesson?.title ?? t('unknownLesson');
  };

  const displayedQuestions = useMemo(() => {
    if (!searchQuery.trim()) return filters.filteredQuestions;
    const query = searchQuery.toLowerCase();
    return filters.filteredQuestions.filter((q) =>
      q.prompt.toLowerCase().includes(query)
    );
  }, [filters.filteredQuestions, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quiz-demo" target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              {t('previewTypes')}
            </Button>
          </Link>
        </div>
      </div>

      <QuestionBankSearch value={searchQuery} onChange={setSearchQuery} />

      <QuestionBankFilters
        modules={modules}
        categoryFilters={filters.categoryFilters}
        subTypeFilters={filters.subTypeFilters}
        toggleSubType={filters.toggleSubType}
        lessonFilters={filters.lessonFilters}
        toggleLesson={filters.toggleLesson}
        includeNoLesson={filters.includeNoLesson}
        setIncludeNoLesson={filters.setIncludeNoLesson}
        hasActiveFilters={filters.hasActiveFilters}
        resetFilters={filters.resetFilters}
        questionCount={displayedQuestions.length}
      />

      <QuestionList
        questions={displayedQuestions}
        modules={modules}
        isLoading={isLoadingQuestions}
        isDeletingQuestion={isDeletingQuestion}
        onDelete={deleteQuestion}
        onPreview={setPreviewQuestion}
      />

      {/* Question Preview Dialog */}
      <Dialog
        open={!!previewQuestion}
        onOpenChange={(open) => !open && setPreviewQuestion(null)}
      >
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-8 py-5">
            <DialogTitle className="font-bold text-xl">
              {t('questionPreview')}
            </DialogTitle>
            {previewQuestion && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">
                  {QUIZ_CATEGORIES[previewQuestion.category].label}
                </Badge>
                <Badge variant="outline">
                  {QUESTION_SUB_TYPE_LABELS[previewQuestion.subType]}
                </Badge>
                {previewQuestion.lessonId && (
                  <Badge variant="outline">
                    <BookOpen className="mr-1 h-3 w-3" />
                    {getLessonTitle(previewQuestion.lessonId)}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-4">
            {previewQuestion && <QuestionPreview question={previewQuestion} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
