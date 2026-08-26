import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';

describe('quiz question editor copy', () => {
  it('presents the stored prompt field as a question in both locales', () => {
    expect(en.Courses.QuizPlayer.prompt).toBe('Question');
    expect(vi.Courses.QuizPlayer.prompt).toBe('Câu hỏi');
  });

  it('stores ICU-safe template placeholders in both locales', () => {
    expect(en.Courses.QuizPlayer.blankTemplatePlaceholder).toBe(
      "e.g. The capital of France is '{{capital}}'."
    );
    expect(vi.Courses.QuizPlayer.blankTemplatePlaceholder).toBe(
      "Ví dụ: Thủ đô của Pháp là '{{capital}}'."
    );
    expect(en.Courses.QuizPlayer.dragAndDropTemplatePlaceholder).toBe(
      "e.g. Red is a '{{zone1}}' color, while Blue is '{{zone2}}'."
    );
    expect(vi.Courses.QuizPlayer.dragAndDropTemplatePlaceholder).toBe(
      "Ví dụ: Đỏ là màu '{{zone1}}', còn xanh là '{{zone2}}'."
    );
  });

  it('renders quiz template placeholders as literal double braces', () => {
    const enT = createTranslator({
      locale: 'en',
      messages: en,
      namespace: 'Courses.QuizPlayer',
    });
    const viT = createTranslator({
      locale: 'vi',
      messages: vi,
      namespace: 'Courses.QuizPlayer',
    });

    expect(enT('blankTemplatePlaceholder')).toBe(
      'e.g. The capital of France is {{capital}}.'
    );
    expect(viT('blankTemplatePlaceholder')).toBe(
      'Ví dụ: Thủ đô của Pháp là {{capital}}.'
    );
    expect(enT('dragAndDropTemplatePlaceholder')).toBe(
      'e.g. Red is a {{zone1}} color, while Blue is {{zone2}}.'
    );
    expect(viT('dragAndDropTemplatePlaceholder')).toBe(
      'Ví dụ: Đỏ là màu {{zone1}}, còn xanh là {{zone2}}.'
    );
  });
});
