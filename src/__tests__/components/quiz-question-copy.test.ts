import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';

describe('quiz question editor copy', () => {
  it('presents the stored prompt field as a question in both locales', () => {
    expect(en.Courses.QuizPlayer.prompt).toBe('Question');
    expect(vi.Courses.QuizPlayer.prompt).toBe('Câu hỏi');
  });
});
