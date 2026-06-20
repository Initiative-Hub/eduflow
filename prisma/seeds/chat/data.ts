import type { DemoChat } from './types';

export const demoChats: DemoChat[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    userKey: 'teacher',
    title: 'Ideas for an engaging web lesson',
    type: 'CHAT_ASSISTANT',
    provider: 'seed',
    model: 'demo-assistant',
    messages: [
      {
        id: '31000000-0000-4000-8000-000000000001',
        role: 'USER',
        parts: [
          {
            type: 'text',
            text: 'Suggest a quick activity for teaching semantic HTML.',
          },
        ],
      },
      {
        id: '31000000-0000-4000-8000-000000000002',
        role: 'ASSISTANT',
        parts: [
          {
            type: 'text',
            text: 'Give learners a page made only from div elements, then ask them to replace each div with the most meaningful semantic element and explain one accessibility benefit.',
          },
        ],
      },
    ],
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    userKey: 'student',
    title: 'Help me improve a paragraph',
    type: 'STUDY_ASSISTANT',
    provider: 'seed',
    model: 'demo-assistant',
    messages: [
      {
        id: '32000000-0000-4000-8000-000000000001',
        role: 'USER',
        parts: [
          {
            type: 'text',
            text: 'How can I make my topic sentences clearer?',
          },
        ],
      },
      {
        id: '32000000-0000-4000-8000-000000000002',
        role: 'ASSISTANT',
        parts: [
          {
            type: 'text',
            text: "State the paragraph's main claim directly, use specific language, and make sure every supporting sentence develops that same claim.",
          },
        ],
      },
    ],
  },
];
