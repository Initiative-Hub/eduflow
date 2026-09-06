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
  | 'essay';

export function toEditorQuestionType(type: string): EditorQuestionType {
  switch (type.replace(/-/g, '_')) {
    case 'multiple_choice':
      return 'multiple_choice';
    case 'true_false':
      return 'true_false';
    case 'fill_in_the_blank':
      return 'fill_in_the_blank';
    case 'matching':
      return 'matching';
    case 'ordering':
      return 'ordering';
    case 'drag_and_drop':
      return 'drag_and_drop';
    case 'essay':
      return 'essay';
    default:
      return 'multiple_choice';
  }
}

function toStoredQuestionType(type: EditorQuestionType): string {
  return type;
}

function getEditorPrompt(question: QuestionBlock) {
  if (question.type === 'fill_in_the_blank') {
    return question.prompt ?? question.promptTemplate;
  }

  return 'prompt' in question ? question.prompt : '';
}

function getMatchItemCode(
  items: Array<{ id: string }>,
  itemId: string,
  prefix: 'L' | 'R'
) {
  const index = items.findIndex((item) => item.id === itemId);
  return index >= 0 ? `${prefix}${index + 1}` : itemId;
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

  // Load question data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (question) {
      setType(toEditorQuestionType(question.type));
      setPrompt(getEditorPrompt(question));
      setExplanation(question.explanation ?? '');

      // Populate type-specific states
      if (question.type === 'multiple_choice') {
        setMcOptions(question.options.map((o: any) => ({ ...o })));
      } else if (question.type === 'true_false') {
        setTfCorrect(question.correctAnswer);
      } else if (question.type === 'fill_in_the_blank') {
        setBlankTemplate(question.promptTemplate);
        setBlankAnswers(
          question.blanks.map((b: any) => ({
            id: b.id,
            answers: b.acceptableAnswers.join(', '),
          }))
        );
      } else if (question.type === 'matching') {
        setMatchLeft(question.leftItems.map((i: any) => ({ ...i })));
        setMatchRight(question.rightItems.map((i: any) => ({ ...i })));
        setMatchPairs(question.correctPairs.map((p: any) => ({ ...p })));
      } else if (question.type === 'ordering') {
        setOrderItems(question.items.map((i: any) => ({ ...i })));
      } else if (question.type === 'drag_and_drop') {
        setDndTemplate(question.sentenceTemplate);
        setDndZones(question.zones.map((z: any) => ({ ...z })));
        setDndItems(question.items.map((i: any) => ({ ...i })));
        setDndMapping({ ...question.correctMapping });
      } else if (question.type === 'essay') {
        setEssayMinWords(question.minWords?.toString() ?? '');
        setEssayMaxWords(question.maxWords?.toString() ?? '');
        setEssayAllowAttachments(!!question.allowAttachments);
        setEssayDelivery(question.deliveryOption ?? 'immediate');
        setEssayAllowTeacherRubric(!!question.allowTeacherRubric);
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
        prompt: prompt.trim(),
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
                <SelectItem value="multiple_choice">
                  {t('questionTypes.multiple_choice')}
                </SelectItem>
                <SelectItem value="true_false">
                  {t('questionTypes.true_false')}
                </SelectItem>
                <SelectItem value="fill_in_the_blank">
                  {t('questionTypes.fill_in_the_blank')}
                </SelectItem>
                <SelectItem value="matching">
                  {t('questionTypes.matching')}
                </SelectItem>
                <SelectItem value="ordering">
                  {t('questionTypes.ordering')}
                </SelectItem>
                <SelectItem value="drag_and_drop">
                  {t('questionTypes.drag_and_drop')}
                </SelectItem>
                <SelectItem value="essay">
                  {t('questionTypes.essay')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt / Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-prompt">{t('prompt')}</Label>
            <Textarea
              id="question-prompt"
              placeholder={t('questionPlaceholder')}
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
                      placeholder={t('optionPlaceholder', {
                        number: index + 1,
                      })}
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
                  {t('blankTemplateHint', { placeholder: '{{company}}' })}
                </span>
                <Textarea
                  id="blank-template"
                  placeholder={t('blankTemplatePlaceholder')}
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
                    {t('blanksConfiguration')}
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
                          placeholder={t('acceptableAnswersPlaceholder')}
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
                        placeholder={t('leftItemPlaceholder')}
                        aria-label={t('leftItem')}
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
                        placeholder={t('rightItemPlaceholder')}
                        aria-label={t('rightItem')}
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
                      <div
                        key={index}
                        className="grid items-center gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_2.5rem]"
                      >
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
                          <SelectTrigger className="min-h-11 w-full">
                            <span className="truncate font-medium text-sm">
                              {getMatchItemCode(matchLeft, pair.leftId, 'L')}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {matchLeft.map((i, itemIndex) => (
                              <SelectItem key={i.id} value={i.id}>
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 font-medium text-muted-foreground">
                                    L{itemIndex + 1}
                                  </span>
                                  <span className="truncate">
                                    {i.text || t('emptyLeftItem')}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="justify-self-center font-semibold text-muted-foreground text-xs">
                          &lt;-&gt;
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
                          <SelectTrigger className="min-h-11 w-full">
                            <span className="truncate font-medium text-sm">
                              {getMatchItemCode(matchRight, pair.rightId, 'R')}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {matchRight.map((i, itemIndex) => (
                              <SelectItem key={i.id} value={i.id}>
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 font-medium text-muted-foreground">
                                    R{itemIndex + 1}
                                  </span>
                                  <span className="truncate">
                                    {i.text || t('emptyRightItem')}
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 justify-self-end"
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
                      placeholder={t('orderingItemPlaceholder')}
                      aria-label={t('orderingItem')}
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
                  {t('dragAndDropTemplateHint', {
                    zone1: '{{zone1}}',
                    zone2: '{{zone2}}',
                  })}
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
                  placeholder={t('dragAndDropTemplatePlaceholder')}
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
                        placeholder={t('draggableItemPlaceholder')}
                        aria-label={t('draggableItem')}
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
                            <SelectValue placeholder={t('selectCorrectItem')} />
                          </SelectTrigger>
                          <SelectContent>
                            {dndItems.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.text || t('emptyItem')}
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
                    aria-label={t('minWords')}
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
                    aria-label={t('maxWords')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <div>
                  <Label className="font-semibold">
                    {t('allowAttachments')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t('allowAttachmentsDescription')}
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
                    {t('allowTeacherRubricDescription')}
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
                      {t('deliveryImmediate')}
                    </SelectItem>
                    <SelectItem value="teacher-review">
                      {t('deliveryTeacherReview')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Explanation General Input */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="question-explanation">{t('explanation')}</Label>
            <Textarea
              id="question-explanation"
              placeholder={t('explanationPlaceholder')}
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
