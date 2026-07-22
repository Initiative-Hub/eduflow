import { describe, expect, it } from 'vitest';
import { aiCourseContentGenerationSchema } from '@/lib/validations/course.schema';

describe('aiCourseContentGenerationSchema', () => {
  it('uses HTML strings for generated lesson content', () => {
    const result = aiCourseContentGenerationSchema.safeParse({
      courseTitle: 'Biology 101',
      description: 'A course about cells.',
      modules: [
        {
          title: 'Cells',
          description: 'Cell structure.',
          lessons: [
            {
              lessonTitle: 'Organelles',
              content: '<h1>Organelles</h1><p>Cells contain organelles.</p>',
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects generated lesson content that is already Tiptap JSON', () => {
    const result = aiCourseContentGenerationSchema.safeParse({
      courseTitle: 'Biology 101',
      description: 'A course about cells.',
      modules: [
        {
          title: 'Cells',
          description: 'Cell structure.',
          lessons: [
            {
              lessonTitle: 'Organelles',
              content: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Cells contain organelles.' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
