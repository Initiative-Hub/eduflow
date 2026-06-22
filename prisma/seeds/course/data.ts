import type { TiptapDocument } from '../../../src/utils/lesson-content';
import type { DemoCourse } from './types';

const lessonDocument = (
  heading: string,
  paragraphs: string[]
): TiptapDocument => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: heading }],
    },
    ...paragraphs.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  ],
});

export const demoCourses: DemoCourse[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    title: 'Foundations of Web Development',
    description:
      'A practical introduction to HTML, CSS, JavaScript, and accessible web interfaces.',
    isPublished: true,
    modules: [
      {
        id: '11000000-0000-4000-8000-000000000001',
        title: 'HTML and the Web',
        orderIndex: 0,
        lessons: [
          {
            id: '11100000-0000-4000-8000-000000000001',
            title: 'How the Web Works',
            orderIndex: 0,
            content: lessonDocument('How the Web Works', [
              'A browser requests resources from a server using URLs and HTTP.',
              'HTML describes document structure, while CSS and JavaScript control presentation and behaviour.',
            ]),
          },
          {
            id: '11100000-0000-4000-8000-000000000002',
            title: 'Semantic HTML',
            orderIndex: 1,
            content: lessonDocument('Semantic HTML', [
              'Semantic elements communicate the purpose of content to browsers and assistive technologies.',
              'Prefer landmarks such as header, main, nav, and footer over anonymous containers when they fit.',
            ]),
          },
        ],
      },
      {
        id: '11000000-0000-4000-8000-000000000002',
        title: 'CSS and Interaction',
        orderIndex: 1,
        lessons: [
          {
            id: '11200000-0000-4000-8000-000000000001',
            title: 'Responsive Layouts',
            orderIndex: 0,
            content: lessonDocument('Responsive Layouts', [
              'Responsive layouts adapt to the available space instead of targeting one fixed screen size.',
              'Use flexible sizing, Grid, Flexbox, and focused media queries to preserve hierarchy.',
            ]),
          },
          {
            id: '11200000-0000-4000-8000-000000000002',
            title: 'JavaScript Events',
            orderIndex: 1,
            content: lessonDocument('JavaScript Events', [
              'Events let an interface respond to actions such as clicks, typing, and form submission.',
              'Keep event handlers focused and update the interface with clear feedback for the user.',
            ]),
          },
        ],
      },
    ],
  },
  {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'Practical English Communication',
    description:
      'Everyday English practice covering clear sentences, conversations, and confident writing.',
    isPublished: true,
    modules: [
      {
        id: '21000000-0000-4000-8000-000000000001',
        title: 'Everyday Conversations',
        orderIndex: 0,
        lessons: [
          {
            id: '21100000-0000-4000-8000-000000000001',
            title: 'Introducing Yourself',
            orderIndex: 0,
            content: lessonDocument('Introducing Yourself', [
              'A useful introduction includes your name and one or two details relevant to the situation.',
              'Ask a simple follow-up question to turn an introduction into a conversation.',
            ]),
          },
          {
            id: '21100000-0000-4000-8000-000000000002',
            title: 'Asking Clear Questions',
            orderIndex: 1,
            content: lessonDocument('Asking Clear Questions', [
              'Open questions invite detail, while closed questions are useful for confirming facts.',
              'Use polite phrases and specific nouns so the listener knows exactly what you need.',
            ]),
          },
        ],
      },
      {
        id: '21000000-0000-4000-8000-000000000002',
        title: 'Confident Writing',
        orderIndex: 1,
        lessons: [
          {
            id: '21200000-0000-4000-8000-000000000001',
            title: 'Building Strong Paragraphs',
            orderIndex: 0,
            content: lessonDocument('Building Strong Paragraphs', [
              'A strong paragraph develops one central idea with a topic sentence and supporting evidence.',
              'Transitions help readers understand how each sentence connects to the next.',
            ]),
          },
          {
            id: '21200000-0000-4000-8000-000000000002',
            title: 'Editing for Clarity',
            orderIndex: 1,
            content: lessonDocument('Editing for Clarity', [
              'Remove repeated ideas and replace vague words with precise language.',
              'Read the final draft aloud to catch awkward rhythm, missing words, and long sentences.',
            ]),
          },
        ],
      },
    ],
  },
];
