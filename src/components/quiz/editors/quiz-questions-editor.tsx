'use client';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Edit,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { QuestionEditorDialog } from './question-editor-dialog';

interface QuizQuestionsEditorProps {
  initialQuestions: QuestionBlock[];
  onSave?: (questions: QuestionBlock[]) => void;
}

export function QuizQuestionsEditor({
  initialQuestions,
  onSave,
}: QuizQuestionsEditorProps) {
  const t = useTranslations('Courses.QuizPlayer');
  const [questions, setQuestions] = useState<QuestionBlock[]>(initialQuestions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBlock | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Open dialog to add new question
  const handleAddClick = () => {
    setEditingQuestion(null);
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  // Open dialog to edit question
  const handleEditClick = (q: QuestionBlock, index: number) => {
    setEditingQuestion(q);
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Delete question
  const handleDeleteClick = (index: number) => {
    if (confirm(t('confirmDelete'))) {
      const updated = questions.filter((_, idx) => idx !== index);
      setQuestions(updated);
      toast.success(t('deleteQuestion') + ' successful');
    }
  };

  // Move question up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setQuestions(updated);
  };

  // Move question down
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setQuestions(updated);
  };

  // Save changes from dialog
  const handleDialogSave = (savedQuestion: QuestionBlock) => {
    if (editingIndex !== null) {
      // Editing existing
      const updated = questions.map((q, idx) =>
        idx === editingIndex ? savedQuestion : q
      );
      setQuestions(updated);
      toast.success('Question updated locally');
    } else {
      // Adding new
      setQuestions([...questions, savedQuestion]);
      toast.success('Question added locally');
    }
  };

  // Handle mock save
  const handleSaveAll = () => {
    console.log('--- TEACHER EDIT MOCK SAVE ---');
    console.log('Quiz Questions Data Payload:');
    console.log(JSON.stringify(questions, null, 2));
    console.log('------------------------------');

    if (onSave) {
      onSave(questions);
    }
    toast.success(t('saveSuccess'));
  };

  // Format type badges nicely
  const getTypeBadge = (type: QuestionBlock['type']) => {
    switch (type) {
      case 'multiple-choice':
        return (
          <Badge className="border-none bg-blue-500 text-white hover:bg-blue-600">
            Multiple Choice
          </Badge>
        );
      case 'true-false':
        return (
          <Badge className="border-none bg-emerald-500 text-white hover:bg-emerald-600">
            True/False
          </Badge>
        );
      case 'fill-in-the-blank':
        return (
          <Badge className="border-none bg-amber-500 text-white hover:bg-amber-600">
            Fill in the Blank
          </Badge>
        );
      case 'matching':
        return (
          <Badge className="border-none bg-indigo-500 text-white hover:bg-indigo-600">
            Matching
          </Badge>
        );
      case 'ordering':
        return (
          <Badge className="border-none bg-purple-500 text-white hover:bg-purple-600">
            Ordering
          </Badge>
        );
      case 'drag-and-drop':
        return (
          <Badge className="border-none bg-teal-500 text-white hover:bg-teal-600">
            Drag & Drop
          </Badge>
        );
      case 'essay':
        return (
          <Badge className="border-none bg-pink-500 text-white hover:bg-pink-600">
            Essay
          </Badge>
        );
      case 'timed-challenge':
        return (
          <Badge className="border-none bg-rose-500 text-white hover:bg-rose-600">
            Timed Challenge
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/5 px-2 py-0.5 font-semibold text-primary text-xs uppercase tracking-wider"
          >
            {t('teacherView')}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {questions.length}{' '}
            {questions.length === 1 ? 'question' : 'questions'} total
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddClick}
            className="cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t('addQuestion')}
          </Button>

          <Button
            type="button"
            onClick={handleSaveAll}
            className="cursor-pointer gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground opacity-65" />
              <p className="text-sm">{t('noQuestionsYet')}</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleAddClick}
                className="mt-1"
              >
                Add the first question
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((q, idx) => (
            <Card
              key={idx}
              className="group transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
            >
              <CardContent className="flex items-start gap-4 p-4">
                {/* Index & Type */}
                <div className="flex w-8 shrink-0 flex-col items-center gap-1">
                  <span className="font-bold text-foreground/80 text-lg">
                    #{idx + 1}
                  </span>
                </div>

                {/* Question Info */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getTypeBadge(q.type)}
                    {q.type === 'timed-challenge' && (
                      <Badge variant="outline" className="text-xs">
                        {q.timeLimitSeconds}s Limit
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 font-semibold text-foreground text-sm md:text-base">
                    {q.type === 'fill-in-the-blank'
                      ? q.promptTemplate
                      : q.prompt}
                  </p>
                  {q.explanation && (
                    <p className="line-clamp-1 text-muted-foreground text-xs italic">
                      {t('explanation')}: {q.explanation}
                    </p>
                  )}
                </div>

                {/* Reorder and Edit Actions */}
                <div className="flex items-center gap-1 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="h-8 w-8 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === questions.length - 1}
                    className="h-8 w-8 disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(q, idx)}
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(idx)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Editor Modal */}
      <QuestionEditorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        question={editingQuestion}
        onSave={handleDialogSave}
      />
    </div>
  );
}
