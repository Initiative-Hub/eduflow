import { z } from 'zod';
import {
  createQuizSchema,
  dragAndDropQuestionSchema,
  essayQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  multipleChoiceQuestionSchema,
  orderingQuestionSchema,
  trueFalseQuestionSchema,
} from '@/lib/validations/quiz.schema';

const questionUnion = z.union([
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  orderingQuestionSchema,
  dragAndDropQuestionSchema,
  essayQuestionSchema,
]);

export const aiQuizSchema = createQuizSchema(questionUnion);

/** Map from normalized quizType string to its type-specific full quiz schema. */
const quizSchemaByType: Record<string, ReturnType<typeof createQuizSchema>> = {
  multiple_choice: createQuizSchema(multipleChoiceQuestionSchema),
  true_false: createQuizSchema(trueFalseQuestionSchema),
  fill_in_the_blank: createQuizSchema(fillInTheBlankQuestionSchema),
  matching: createQuizSchema(matchingQuestionSchema),
  ordering: createQuizSchema(orderingQuestionSchema),
  drag_and_drop: createQuizSchema(dragAndDropQuestionSchema),
  essay: createQuizSchema(essayQuestionSchema),
};

/**
 * Returns the strict Zod schema for a given quizType.
 * Falls back to the union schema if quizType is unknown.
 */
export function getQuizSchemaByType(quizType?: string) {
  if (!quizType) return aiQuizSchema;
  return quizSchemaByType[quizType.toLowerCase()] ?? aiQuizSchema;
}

type Quiz = z.infer<typeof aiQuizSchema>;

function normalizeId(id: unknown, prefix = 'opt') {
  if (typeof id === 'string' && id.trim()) return id;
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

function mapMultipleChoice(q: any) {
  const options = Array.isArray(q.options)
    ? q.options
    : q.options?.split('\n') || [];
  const mappedOptions = options.map((o: any, idx: number) => {
    if (typeof o === 'string') {
      return { id: normalizeId(`opt${idx + 1}`), text: o, isCorrect: false };
    }
    return {
      id: normalizeId(o.id, `opt${idx + 1}`),
      text: o.text ?? String(o),
      isCorrect: !!o.isCorrect,
    };
  });

  if (q.correctIndex !== undefined && mappedOptions[q.correctIndex]) {
    mappedOptions.forEach((option: any, index: number) => {
      option.isCorrect = index === q.correctIndex;
    });
  }

  return {
    type: 'multiple_choice',
    prompt: q.prompt ?? q.question ?? '',
    options: mappedOptions,
    explanation: q.explanation,
  };
}

function mapTrueFalse(q: any) {
  const correct = q.correctAnswer;
  return {
    type: 'true_false',
    prompt: q.prompt ?? q.question ?? '',
    correctAnswer:
      typeof correct === 'boolean'
        ? correct
        : String(correct).toLowerCase().startsWith('t'),
    explanation: q.explanation,
  };
}

function mapFillBlank(q: any) {
  let promptTemplate = q.promptTemplate ?? q.prompt ?? q.question ?? '';
  const prompt = q.prompt ?? q.question ?? promptTemplate;

  const makeBlank = (id: string, acceptableAnswers: string[]) => ({
    id,
    acceptableAnswers,
  });

  if (Array.isArray(q.blanks) && q.blanks.length > 0) {
    const blanks = q.blanks.map((b: any) =>
      makeBlank(
        b.id ?? normalizeId(undefined, 'blank'),
        Array.isArray(b.acceptableAnswers)
          ? b.acceptableAnswers
          : [String(b.acceptableAnswers ?? '')]
      )
    );

    return {
      type: 'fill_in_the_blank',
      prompt,
      promptTemplate,
      blanks,
      explanation: q.explanation,
    };
  }

  if (Array.isArray(q.options) && q.options.length > 0) {
    const underscoreRegex = /_{2,}/g;
    const found = String(promptTemplate).match(underscoreRegex);
    const blanks: Array<{ id: string; acceptableAnswers: string[] }> = [];
    let index = 1;

    if (found && found.length > 0) {
      promptTemplate = String(promptTemplate).replace(underscoreRegex, () => {
        const id = `blank${index}`;
        blanks.push(makeBlank(id, []));
        index += 1;
        return `{{${id}}}`;
      });
    } else {
      const id = 'blank1';
      blanks.push(makeBlank(id, []));
      promptTemplate = `${promptTemplate} {{${id}}}`;
    }

    const correctOptions = q.options.filter(
      (o: any) => !!o.isCorrect || !!o.correct
    );
    if (correctOptions.length > 0) {
      if (blanks.length === 1) {
        blanks[0].acceptableAnswers = correctOptions.map((o: any) =>
          String(o.text ?? o)
        );
      } else {
        for (
          let i = 0;
          i < Math.min(blanks.length, correctOptions.length);
          i++
        ) {
          blanks[i].acceptableAnswers = [
            String(correctOptions[i].text ?? correctOptions[i]),
          ];
        }
      }
    } else if (blanks.length === 1) {
      blanks[0].acceptableAnswers = q.options.map((o: any) =>
        String(o.text ?? o)
      );
    } else {
      for (let i = 0; i < blanks.length; i++) {
        blanks[i].acceptableAnswers = [String(q.options[i]?.text ?? '')];
      }
    }

    return {
      type: 'fill_in_the_blank',
      prompt,
      promptTemplate,
      blanks,
      explanation: q.explanation,
    };
  }

  const underscoreRegex = /_{2,}/g;
  const found = String(promptTemplate).match(underscoreRegex);
  if (found && found.length > 0) {
    const blanks: Array<{ id: string; acceptableAnswers: string[] }> = [];
    let index = 1;
    promptTemplate = String(promptTemplate).replace(underscoreRegex, () => {
      const id = `blank${index}`;
      blanks.push(makeBlank(id, []));
      index += 1;
      return `{{${id}}}`;
    });

    if (q.answer) {
      if (typeof q.answer === 'string' && blanks.length === 1) {
        blanks[0].acceptableAnswers = [q.answer];
      } else if (Array.isArray(q.answer)) {
        for (let i = 0; i < Math.min(blanks.length, q.answer.length); i++) {
          blanks[i].acceptableAnswers = [String(q.answer[i])];
        }
      }
    }

    return {
      type: 'fill_in_the_blank',
      prompt,
      promptTemplate,
      blanks,
      explanation: q.explanation,
    };
  }

  if (typeof q.answer === 'string' && promptTemplate.trim()) {
    const id = 'blank1';
    const escapedAnswer = String(q.answer).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
    const answerRegex = new RegExp(escapedAnswer, 'i');
    if (answerRegex.test(promptTemplate)) {
      promptTemplate = promptTemplate.replace(answerRegex, `{{${id}}}`);
    } else {
      promptTemplate = `${promptTemplate} {{${id}}}`;
    }

    return {
      type: 'fill_in_the_blank',
      prompt,
      promptTemplate,
      blanks: [makeBlank(id, [String(q.answer)])],
      explanation: q.explanation,
    };
  }

  return {
    type: 'fill_in_the_blank',
    prompt,
    promptTemplate,
    blanks: [],
    explanation: q.explanation,
  };
}

function mapMatching(q: any) {
  const leftItems = Array.isArray(q.leftItems)
    ? q.leftItems.map((i: any, idx: number) => ({
        id: i.id ?? `left${idx + 1}`,
        text: i.text ?? String(i),
      }))
    : [];
  const rightItems = Array.isArray(q.rightItems)
    ? q.rightItems.map((i: any, idx: number) => ({
        id: i.id ?? `right${idx + 1}`,
        text: i.text ?? String(i),
      }))
    : [];
  const correctPairs = Array.isArray(q.correctPairs)
    ? q.correctPairs.map((p: any) => ({ leftId: p.leftId, rightId: p.rightId }))
    : [];

  return {
    type: 'matching',
    prompt: q.prompt ?? q.question ?? '',
    leftItems,
    rightItems,
    correctPairs,
    explanation: q.explanation,
  };
}

function mapOrdering(q: any) {
  const items = Array.isArray(q.items)
    ? q.items.map((it: any, idx: number) => ({
        id: it.id ?? `item${idx + 1}`,
        text: it.text ?? String(it),
      }))
    : [];
  const correctOrder = Array.isArray(q.correctOrder)
    ? q.correctOrder
    : (q.correctOrderIds ?? []).map(String);

  return {
    type: 'ordering',
    prompt: q.prompt ?? q.question ?? '',
    items,
    correctOrder,
    explanation: q.explanation,
  };
}

function mapDragAndDrop(q: any) {
  const zones = Array.isArray(q.zones)
    ? q.zones.map((z: any) => ({ id: z.id, label: z.label ?? z.name ?? '' }))
    : [];
  const items = Array.isArray(q.items)
    ? q.items.map((it: any) => ({ id: it.id, text: it.text ?? String(it) }))
    : [];
  const correctMapping = q.correctMapping ?? q.mapping ?? {};

  return {
    type: 'drag_and_drop',
    prompt: q.prompt ?? q.question ?? q.sentenceTemplate ?? '',
    sentenceTemplate: q.sentenceTemplate ?? q.promptTemplate ?? '',
    zones,
    items,
    correctMapping,
    explanation: q.explanation,
  };
}

function mapEssay(q: any) {
  return {
    type: 'essay',
    prompt: q.prompt ?? q.question ?? '',
    rubric: Array.isArray(q.rubric) ? q.rubric : undefined,
    minWords: q.minWords,
    maxWords: q.maxWords,
    allowAttachments: q.allowAttachments,
    deliveryOption: q.deliveryOption,
    allowTeacherRubric: q.allowTeacherRubric,
    explanation: q.explanation,
  };
}

function mapQuestion(q: any) {
  const t = (q.type ?? q.questionType ?? '').toString().toLowerCase();
  if (t.includes('multiple') || t.includes('mcq')) return mapMultipleChoice(q);
  if (t.includes('true') || t.includes('false') || t === 'boolean')
    return mapTrueFalse(q);
  if (t.includes('fill') || t.includes('blank')) return mapFillBlank(q);
  if (t.includes('match')) return mapMatching(q);
  if (t.includes('order')) return mapOrdering(q);
  if (t.includes('drag') || t.includes('drop')) return mapDragAndDrop(q);
  if (t.includes('essay')) return mapEssay(q);

  return mapMultipleChoice(q);
}

function mapQuizShape(aiOutput: any) {
  const title = aiOutput.title ?? aiOutput.name ?? 'Untitled Quiz';
  const description = aiOutput.description ?? aiOutput.summary ?? '';
  const category = aiOutput.category ?? 'SELECTION_BASED';
  const subType = aiOutput.subType ?? aiOutput.format ?? 'MANUAL_CREATE';
  const deliveryMode = aiOutput.deliveryMode ?? 'INSTANT_FEEDBACK';
  const selectionMethod = aiOutput.selectionMethod ?? 'MANUAL_CREATE';
  const questionCount = Number(
    aiOutput.questionCount ??
      (Array.isArray(aiOutput.questions) ? aiOutput.questions.length : 0)
  );

  const questionsRaw = Array.isArray(aiOutput.questions)
    ? aiOutput.questions
    : [];
  const questions = questionsRaw.map(mapQuestion);

  return {
    title,
    description,
    category,
    subType,
    deliveryMode,
    selectionMethod,
    questionCount,
    questions,
  };
}

export function mapAIQuizToSchema(aiOutput: any, quizType?: string): Quiz {
  const mapped = mapQuizShape(aiOutput);
  const schema = getQuizSchemaByType(quizType);
  return schema.parse(mapped);
}

export function safeMapAIQuizToSchema(aiOutput: any, quizType?: string) {
  const mapped = mapQuizShape(aiOutput);
  const schema = getQuizSchemaByType(quizType);
  return schema.safeParse(mapped);
}

export default mapAIQuizToSchema;
