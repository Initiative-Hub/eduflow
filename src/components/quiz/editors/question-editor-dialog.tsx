'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { cn } from '@/lib/utils';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

type EditorQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_in_the_blank'
  | 'matching'
  | 'ordering'
  | 'drag_and_drop'
  | 'essay'
  | 'timed_challenge';

function toEditorQuestionType(type: string): EditorQuestionType {
  switch (type.replace(/-/g, '_')) {
    case 'multiple_choice':
      return 'multiple_choice';
    case 'true_false':
      return 'true_false';
    case 'fill_in_the_blank':
      return 'fill_in_the_blank';
    case 'drag_and_drop':
      return 'drag_and_drop';
    case 'timed_challenge':
      return 'timed_challenge';
    default:
      return 'multiple_choice';
  }
}

function toStoredQuestionType(type: EditorQuestionType): string {
  switch (type) {
    case 'multiple_choice':
      return 'multiple_choice';
    case 'true_false':
      return 'true_false';
    case 'fill_in_the_blank':
      return 'fill_in_the_blank';
    case 'drag_and_drop':
      return 'drag_and_drop';
    case 'timed_challenge':
      return 'timed_challenge';
    default:
      return type;
  }
}

interface QuestionEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  question: QuestionBlock | null; // null means adding a new question
  onSave: (savedQuestion: QuestionBlock) => void;
}

export function QuestionEditorDialog({
  isOpen,
  onOpenChange,
  question,
  onSave,
}: QuestionEditorDialogProps) {
  const t = useTranslations('Courses.QuizPlayer');

  // Question type & general fields
  const [type, setType] = useState<EditorQuestionType>('multiple_choice');
  const [prompt, setPrompt] = useState('');
  const [explanation, setExplanation] = useState('');

  // Type-specific states
  // Multiple Choice
  const [mcOptions, setMcOptions] = useState<
    Array<{ id: string; text: string; isCorrect: boolean }>
  >([]);

  // True/False
  const [tfCorrect, setTfCorrect] = useState(true);

  // Fill in the Blank
  const [blankTemplate, setBlankTemplate] = useState('');
  const [blankAnswers, setBlankAnswers] = useState<
    Array<{ id: string; answers: string }>
  >([]);

  // Matching
  const [matchLeft, setMatchLeft] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [matchRight, setMatchRight] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [matchPairs, setMatchPairs] = useState<
    Array<{ leftId: string; rightId: string }>
  >([]);

  // Ordering
  const [orderItems, setOrderItems] = useState<
    Array<{ id: string; text: string }>
  >([]);

  // Drag and Drop
  const [dndTemplate, setDndTemplate] = useState('');
  const [dndZones, setDndZones] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [dndItems, setDndItems] = useState<Array<{ id: string; text: string }>>(
    []
  );
  const [dndMapping, setDndMapping] = useState<Record<string, string>>({});

  // Essay
  const [essayMinWords, setEssayMinWords] = useState('');
  const [essayMaxWords, setEssayMaxWords] = useState('');
  const [essayAllowAttachments, setEssayAllowAttachments] = useState(false);
  const [essayDelivery, setEssayDelivery] = useState<
    'immediate' | 'teacher-review'
  >('immediate');
  const [essayAllowTeacherRubric, setEssayAllowTeacherRubric] = useState(false);

  // Timed Challenge
  const [timeLimit, setTimeLimit] = useState(60);
  const [innerType, setInnerType] =
    useState<Exclude<EditorQuestionType, 'timed_challenge'>>('multiple_choice');
  // Simple inner MC state for nested demo
  const [innerMcOptions, setInnerMcOptions] = useState<
    Array<{ id: string; text: string; isCorrect: boolean }>
  >([
    { id: generateId(), text: 'Option A', isCorrect: true },
    { id: generateId(), text: 'Option B', isCorrect: false },
  ]);

  // Load question data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (question) {
      const currentQuestion = question as any;

      setType(toEditorQuestionType(currentQuestion.type));
      setPrompt('prompt' in currentQuestion ? currentQuestion.prompt : '');
      setExplanation(currentQuestion.explanation ?? '');

      // Populate type-specific states
      if (currentQuestion.type === 'multiple_choice') {
        setMcOptions(currentQuestion.options.map((o: any) => ({ ...o })));
      } else if (currentQuestion.type === 'true_false') {
        setTfCorrect(currentQuestion.correctAnswer);
      } else if (currentQuestion.type === 'fill_in_the_blank') {
        setBlankTemplate(currentQuestion.promptTemplate);
        setBlankAnswers(
          currentQuestion.blanks.map((b: any) => ({
            id: b.id,
            answers: b.acceptableAnswers.join(', '),
          }))
        );
      } else if (currentQuestion.type === 'matching') {
        setMatchLeft(currentQuestion.leftItems.map((i: any) => ({ ...i })));
        setMatchRight(currentQuestion.rightItems.map((i: any) => ({ ...i })));
        setMatchPairs(currentQuestion.correctPairs.map((p: any) => ({ ...p })));
      } else if (currentQuestion.type === 'ordering') {
        setOrderItems(currentQuestion.items.map((i: any) => ({ ...i })));
      } else if (currentQuestion.type === 'drag_and_drop') {
        setDndTemplate(currentQuestion.sentenceTemplate);
        setDndZones(currentQuestion.zones.map((z: any) => ({ ...z })));
        setDndItems(currentQuestion.items.map((i: any) => ({ ...i })));
        setDndMapping({ ...currentQuestion.correctMapping });
      } else if (currentQuestion.type === 'essay') {
        setEssayMinWords(currentQuestion.minWords?.toString() ?? '');
        setEssayMaxWords(currentQuestion.maxWords?.toString() ?? '');
        setEssayAllowAttachments(!!currentQuestion.allowAttachments);
        setEssayDelivery(currentQuestion.deliveryOption ?? 'immediate');
        setEssayAllowTeacherRubric(!!currentQuestion.allowTeacherRubric);
      } else if (currentQuestion.type === 'timed_challenge') {
        setTimeLimit(currentQuestion.timeLimitSeconds);
        if (currentQuestion.innerQuestion) {
          setInnerType(
            toEditorQuestionType(currentQuestion.innerQuestion.type) as Exclude<
              EditorQuestionType,
              'timed_challenge'
            >
          );
          if (currentQuestion.innerQuestion.type === 'multiple_choice') {
            setInnerMcOptions(
              currentQuestion.innerQuestion.options.map((o: any) => ({ ...o }))
            );
          }
        }
      }
    } else {
      // Reset to defaults for new question
      setType('multiple_choice');
      setPrompt('');
      setExplanation('');
      setMcOptions([
        { id: generateId(), text: '', isCorrect: true },
        { id: generateId(), text: '', isCorrect: false },
      ]);
      setTfCorrect(true);
      setBlankTemplate('');
      setBlankAnswers([]);
      setMatchLeft([]);
      setMatchRight([]);
      setMatchPairs([]);
      setOrderItems([]);
      setDndTemplate('');
      setDndZones([]);
      setDndItems([]);
      setDndMapping({});
      setEssayMinWords('');
      setEssayMaxWords('');
      setEssayAllowAttachments(false);
      setEssayDelivery('immediate');
      setEssayAllowTeacherRubric(false);
      setTimeLimit(60);
      setInnerType('multiple_choice');
    }
  }, [question, isOpen]);

  // Handle Save
  const handleSave = () => {
    if (!prompt.trim()) return;

    let savedQuestion: any;

    if (type === 'multiple_choice') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        options: mcOptions.map((o) => ({
          id: o.id,
          text: o.text.trim(),
          isCorrect: o.isCorrect,
        })),
      };
    } else if (type === 'true_false') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        correctAnswer: tfCorrect,
      };
    } else if (type === 'fill_in_the_blank') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        promptTemplate: blankTemplate.trim(),
        explanation: explanation.trim() || undefined,
        blanks: blankAnswers.map((b) => ({
          id: b.id,
          acceptableAnswers: b.answers
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
        })),
      } as any;
    } else if (type === 'matching') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        leftItems: matchLeft.map((i) => ({ id: i.id, text: i.text.trim() })),
        rightItems: matchRight.map((i) => ({ id: i.id, text: i.text.trim() })),
        correctPairs: matchPairs,
      };
    } else if (type === 'ordering') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        items: orderItems.map((i) => ({ id: i.id, text: i.text.trim() })),
        correctOrder: orderItems.map((i) => i.id),
      };
    } else if (type === 'drag_and_drop') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        sentenceTemplate: dndTemplate.trim(),
        zones: dndZones,
        items: dndItems.map((i) => ({ id: i.id, text: i.text.trim() })),
        correctMapping: dndMapping,
      };
    } else if (type === 'essay') {
      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        minWords: essayMinWords
          ? Number.parseInt(essayMinWords, 10)
          : undefined,
        maxWords: essayMaxWords
          ? Number.parseInt(essayMaxWords, 10)
          : undefined,
        allowAttachments: essayAllowAttachments,
        deliveryOption: essayDelivery,
        allowTeacherRubric: essayAllowTeacherRubric,
      };
    } else if (type === 'timed_challenge') {
      // Build inner question
      const innerQuestion =
        innerType === 'multiple_choice'
          ? {
              type: 'multiple_choice',
              prompt: prompt.trim(),
              options: innerMcOptions.map((o) => ({
                id: o.id,
                text: o.text.trim(),
                isCorrect: o.isCorrect,
              })),
            }
          : {
              type: 'true_false',
              prompt: prompt.trim(),
              correctAnswer: tfCorrect,
            };

      savedQuestion = {
        type: toStoredQuestionType(type),
        prompt: prompt.trim(),
        explanation: explanation.trim() || undefined,
        timeLimitSeconds: timeLimit,
        innerQuestion,
      };
    } else {
      return;
    }
    // console.log(savedQuestion);
    onSave(savedQuestion as QuestionBlock);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">
            {question ? t('editQuestion') : t('addQuestion')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question Type Select */}
          <div className="space-y-2">
            <Label>{t('questionType')}</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as EditorQuestionType)}
              disabled={!!question} // Disable type changes for existing questions to prevent schema errors
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('questionType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="fill_in_the_blank">
                  Fill in the Blank
                </SelectItem>
                <SelectItem value="matching">Matching</SelectItem>
                <SelectItem value="ordering">Ordering</SelectItem>
                <SelectItem value="drag_and_drop">Drag & Drop</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="timed_challenge">Timed Challenge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt / Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-prompt">{t('prompt')}</Label>
            <Textarea
              id="question-prompt"
              placeholder="What is the question?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Type-Specific Editors */}

          {/* 1. Multiple Choice */}
          {type === 'multiple_choice' && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-base">
                  {t('options')}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMcOptions([
                      ...mcOptions,
                      { id: generateId(), text: '', isCorrect: false },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t('addOption')}
                </Button>
              </div>

              <div className="space-y-2.5">
                {mcOptions.map((option, index) => (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-2 transition-all',
                      option.isCorrect
                        ? 'border-green-500 bg-green-50/30 dark:bg-green-950/10'
                        : 'border-border'
                    )}
                  >
                    <input
                      type="radio"
                      name="mc-correct-option"
                      checked={option.isCorrect}
                      onChange={() => {
                        setMcOptions(
                          mcOptions.map((o) => ({
                            ...o,
                            isCorrect: o.id === option.id,
                          }))
                        );
                      }}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-green-600"
                      title={t('correctAnswer')}
                    />
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => {
                        setMcOptions(
                          mcOptions.map((o) =>
                            o.id === option.id
                              ? { ...o, text: e.target.value }
                              : o
                          )
                        );
                      }}
                      className="flex-1 border-none px-0 shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        setMcOptions(
                          mcOptions.filter((o) => o.id !== option.id)
                        )
                      }
                      disabled={mcOptions.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. True / False */}
          {type === 'true_false' && (
            <div className="space-y-3 border-t pt-4">
              <Label>{t('correctAnswer')}</Label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="tf-correct"
                    checked={tfCorrect === true}
                    onChange={() => setTfCorrect(true)}
                    className="h-4 w-4 accent-primary"
                  />
                  {t('true')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="tf-correct"
                    checked={tfCorrect === false}
                    onChange={() => setTfCorrect(false)}
                    className="h-4 w-4 accent-primary"
                  />
                  {t('false')}
                </label>
              </div>
            </div>
          )}

          {/* 3. Fill in the Blank */}
          {type === 'fill_in_the_blank' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="blank-template">{t('sentenceTemplate')}</Label>
                <span className="block text-muted-foreground text-xs">
                  Use double curly braces to indicate blanks: e.g. "React was
                  created by {'{{company}}'}"
                </span>
                <Textarea
                  id="blank-template"
                  placeholder="e.g. The capital of France is {{capital}}."
                  value={blankTemplate}
                  onChange={(e) => {
                    setBlankTemplate(e.target.value);
                    // Automatically detect blanks from template
                    const regex = /\{\{(\w+)\}\}/g;
                    const detectedBlanks: string[] = [];
                    let match = regex.exec(e.target.value);
                    while (match !== null) {
                      detectedBlanks.push(match[1]);
                      match = regex.exec(e.target.value);
                    }

                    // Update blankAnswers list preserving existing answers
                    setBlankAnswers((prev) => {
                      return detectedBlanks.map((bId) => {
                        const existing = prev.find((p) => p.id === bId);
                        return {
                          id: bId,
                          answers: existing ? existing.answers : '',
                        };
                      });
                    });
                  }}
                  rows={2}
                />
              </div>

              {blankAnswers.length > 0 && (
                <div className="space-y-3">
                  <Label className="font-semibold text-sm">
                    Blanks Configuration
                  </Label>
                  <div className="space-y-2">
                    {blankAnswers.map((blank) => (
                      <div
                        key={blank.id}
                        className="grid grid-cols-3 items-center gap-3"
                      >
                        <span className="font-mono text-primary text-sm">
                          {'{{'}
                          {blank.id}
                          {'}}'}
                        </span>
                        <Input
                          placeholder="Acceptable answers..."
                          value={blank.answers}
                          onChange={(e) => {
                            setBlankAnswers(
                              blankAnswers.map((ba) =>
                                ba.id === blank.id
                                  ? { ...ba, answers: e.target.value }
                                  : ba
                              )
                            );
                          }}
                          className="col-span-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Matching */}
          {type === 'matching' && (
            <div className="space-y-5 border-t pt-4">
              {/* Left Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{t('leftItems')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMatchLeft([
                        ...matchLeft,
                        { id: generateId(), text: '' },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('addItem')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {matchLeft.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="w-6 text-muted-foreground text-xs">
                        L{index + 1}
                      </span>
                      <Input
                        placeholder="Left side item"
                        value={item.text}
                        onChange={(e) =>
                          setMatchLeft(
                            matchLeft.map((i) =>
                              i.id === item.id
                                ? { ...i, text: e.target.value }
                                : i
                            )
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setMatchLeft(
                            matchLeft.filter((i) => i.id !== item.id)
                          );
                          // Clean up pairs
                          setMatchPairs(
                            matchPairs.filter((p) => p.leftId !== item.id)
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Items */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{t('rightItems')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMatchRight([
                        ...matchRight,
                        { id: generateId(), text: '' },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('addItem')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {matchRight.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="w-6 text-muted-foreground text-xs">
                        R{index + 1}
                      </span>
                      <Input
                        placeholder="Right side item"
                        value={item.text}
                        onChange={(e) =>
                          setMatchRight(
                            matchRight.map((i) =>
                              i.id === item.id
                                ? { ...i, text: e.target.value }
                                : i
                            )
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setMatchRight(
                            matchRight.filter((i) => i.id !== item.id)
                          );
                          // Clean up pairs
                          setMatchPairs(
                            matchPairs.filter((p) => p.rightId !== item.id)
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matching Pairs */}
              {matchLeft.length > 0 && matchRight.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">
                      {t('matchingPairs')}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setMatchPairs([
                          ...matchPairs,
                          {
                            leftId: matchLeft[0].id,
                            rightId: matchRight[0].id,
                          },
                        ])
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {t('addPair')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {matchPairs.map((pair, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={pair.leftId}
                          onValueChange={(val) =>
                            setMatchPairs(
                              matchPairs.map((p, idx) =>
                                idx === index ? { ...p, leftId: val } : p
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {matchLeft.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.text || '(empty left)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="font-semibold text-muted-foreground">
                          ↔
                        </span>

                        <Select
                          value={pair.rightId}
                          onValueChange={(val) =>
                            setMatchPairs(
                              matchPairs.map((p, idx) =>
                                idx === index ? { ...p, rightId: val } : p
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {matchRight.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.text || '(empty right)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setMatchPairs(
                              matchPairs.filter((_, idx) => idx !== index)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Ordering */}
          {type === 'ordering' && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">{t('orderingItems')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOrderItems([
                      ...orderItems,
                      { id: generateId(), text: '' },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t('addItem')}
                </Button>
              </div>

              <div className="space-y-2">
                {orderItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="w-8 font-semibold text-muted-foreground text-xs">
                      #{index + 1}
                    </span>
                    <Input
                      placeholder="Step / Item text"
                      value={item.text}
                      onChange={(e) =>
                        setOrderItems(
                          orderItems.map((o) =>
                            o.id === item.id
                              ? { ...o, text: e.target.value }
                              : o
                          )
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOrderItems(
                          orderItems.filter((o) => o.id !== item.id)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Drag & Drop */}
          {type === 'drag_and_drop' && (
            <div className="space-y-5 border-t pt-4">
              {/* Sentence Template */}
              <div className="space-y-2">
                <Label>{t('sentenceTemplate')}</Label>
                <span className="block text-muted-foreground text-xs">
                  Specify zone placeholders: e.g. "Google was founded in{' '}
                  {'{{zone1}}'} by {'{{zone2}}'}."
                </span>
                <Textarea
                  value={dndTemplate}
                  onChange={(e) => {
                    setDndTemplate(e.target.value);
                    // Auto-parse zones
                    const regex = /\{\{(\w+)\}\}/g;
                    const detectedZones: string[] = [];
                    let match = regex.exec(e.target.value);
                    while (match !== null) {
                      detectedZones.push(match[1]);
                      match = regex.exec(e.target.value);
                    }
                    setDndZones(
                      detectedZones.map((zId) => {
                        const existing = dndZones.find((z) => z.id === zId);
                        return {
                          id: zId,
                          label: existing ? existing.label : `Zone ${zId}`,
                        };
                      })
                    );
                  }}
                  placeholder="e.g. Red is a {{zone1}} color, while Blue is {{zone2}}."
                  rows={2}
                />
              </div>

              {/* Draggable Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{t('draggableItems')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDndItems([...dndItems, { id: generateId(), text: '' }])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('addItem')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {dndItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Draggable label"
                        value={item.text}
                        onChange={(e) =>
                          setDndItems(
                            dndItems.map((i) =>
                              i.id === item.id
                                ? { ...i, text: e.target.value }
                                : i
                            )
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDndItems(dndItems.filter((i) => i.id !== item.id));
                          // Clean mapping
                          const updatedMap = { ...dndMapping };
                          for (const key of Object.keys(updatedMap)) {
                            if (updatedMap[key] === item.id) {
                              delete updatedMap[key];
                            }
                          }
                          setDndMapping(updatedMap);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mapping */}
              {dndZones.length > 0 && dndItems.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="font-semibold">{t('correctMapping')}</Label>
                  <div className="space-y-2.5">
                    {dndZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="w-1/3 font-mono text-primary text-sm">
                          {'{{'}
                          {zone.id}
                          {'}}'} ({zone.label})
                        </span>
                        <Select
                          value={dndMapping[zone.id] || ''}
                          onValueChange={(val) =>
                            setDndMapping({ ...dndMapping, [zone.id]: val })
                          }
                        >
                          <SelectTrigger className="w-2/3">
                            <SelectValue placeholder="Select correct item..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dndItems.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.text || '(empty item)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Essay */}
          {type === 'essay' && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="essay-min-words">{t('minWords')}</Label>
                  <Input
                    id="essay-min-words"
                    type="number"
                    value={essayMinWords}
                    onChange={(e) => setEssayMinWords(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="essay-max-words">{t('maxWords')}</Label>
                  <Input
                    id="essay-max-words"
                    type="number"
                    value={essayMaxWords}
                    onChange={(e) => setEssayMaxWords(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <div>
                  <Label className="font-semibold">
                    {t('allowAttachments')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Let students upload files with essay answers
                  </p>
                </div>
                <Switch
                  checked={essayAllowAttachments}
                  onCheckedChange={setEssayAllowAttachments}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <div>
                  <Label className="font-semibold">
                    {t('allowTeacherRubric')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Define custom grading rubric files or descriptions
                  </p>
                </div>
                <Switch
                  checked={essayAllowTeacherRubric}
                  onCheckedChange={setEssayAllowTeacherRubric}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('deliveryOption')}</Label>
                <Select
                  value={essayDelivery}
                  onValueChange={(val) => setEssayDelivery(val as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      Immediate AI evaluation
                    </SelectItem>
                    <SelectItem value="teacher-review">
                      Hold for Teacher review
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 8. Timed Challenge */}
          {type === 'timed_challenge' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="timed-limit">{t('timeLimit')}</Label>
                <Input
                  id="timed-limit"
                  type="number"
                  min={5}
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(Number.parseInt(e.target.value, 10))
                  }
                />
              </div>

              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <Label className="block border-b pb-1.5 font-bold text-primary text-sm">
                  Nested Question Setup
                </Label>

                <div className="mt-2 space-y-2">
                  <Label>{t('innerQuestionType')}</Label>
                  <Select
                    value={innerType}
                    onValueChange={(val) => setInnerType(val as any)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {innerType === 'multiple_choice' && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">
                        {t('options')}
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setInnerMcOptions([
                            ...innerMcOptions,
                            { id: generateId(), text: '', isCorrect: false },
                          ])
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t('addOption')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {innerMcOptions.map((option, idx) => (
                        <div
                          key={option.id}
                          className={cn(
                            'flex items-center gap-2 rounded-md border p-1.5 transition-all',
                            option.isCorrect
                              ? 'border-green-500 bg-green-50/20 dark:bg-green-950/10'
                              : 'border-border'
                          )}
                        >
                          <input
                            type="radio"
                            name="inner-mc-correct-option"
                            checked={option.isCorrect}
                            onChange={() => {
                              setInnerMcOptions(
                                innerMcOptions.map((o) => ({
                                  ...o,
                                  isCorrect: o.id === option.id,
                                }))
                              );
                            }}
                            className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-green-600"
                          />
                          <Input
                            placeholder={`Option ${idx + 1}`}
                            value={option.text}
                            onChange={(e) =>
                              setInnerMcOptions(
                                innerMcOptions.map((o) =>
                                  o.id === option.id
                                    ? { ...o, text: e.target.value }
                                    : o
                                )
                              )
                            }
                            className="h-8 flex-1 border-none px-0 text-sm shadow-none focus-visible:ring-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Explanation General Input */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="question-explanation">{t('explanation')}</Label>
            <Textarea
              id="question-explanation"
              placeholder="Provide context or explanation for why the answer is correct."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!prompt.trim()}>
            {t('saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
