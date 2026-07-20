import { describe, expect, it } from 'vitest';
import { toEditorQuestionType } from '@/components/quiz/editors/question-editor-dialog';

describe('question editor type mapping', () => {
  it.each([
    ['matching', 'matching'],
    ['ordering', 'ordering'],
    ['essay', 'essay'],
    ['drag-and-drop', 'drag_and_drop'],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(toEditorQuestionType(input)).toBe(expected);
  });

  it('falls back to multiple choice for unsupported legacy types', () => {
    expect(toEditorQuestionType('timed_challenge')).toBe('multiple_choice');
  });
});
