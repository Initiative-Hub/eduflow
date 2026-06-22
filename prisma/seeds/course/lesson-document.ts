import type { JSONContent } from '@tiptap/core';
import type { TiptapDocument } from '../../../src/utils/lesson-content';

type LessonSection = {
  heading: string;
  body: string;
};

type LessonDocumentInput = {
  title: string;
  overview: string;
  objectives: string[];
  sections: LessonSection[];
  practice: string;
  takeaway: string;
};

const textNode = (text: string): JSONContent => ({ type: 'text', text });

const headingNode = (text: string, level: 2 | 3): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [textNode(text)],
});

const paragraphNode = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [textNode(text)],
});

export const lessonDocument = ({
  title,
  overview,
  objectives,
  sections,
  practice,
  takeaway,
}: LessonDocumentInput): TiptapDocument => ({
  type: 'doc',
  content: [
    headingNode(title, 2),
    paragraphNode(overview),
    headingNode('Learning objectives', 3),
    {
      type: 'bulletList',
      content: objectives.map((objective) => ({
        type: 'listItem',
        content: [paragraphNode(objective)],
      })),
    },
    ...sections.flatMap(({ heading, body }) => [
      headingNode(heading, 3),
      paragraphNode(body),
    ]),
    headingNode('Guided practice', 3),
    paragraphNode(practice),
    headingNode('Key takeaway', 3),
    paragraphNode(takeaway),
  ],
});
