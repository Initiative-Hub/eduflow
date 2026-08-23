import type { DemoGameQuiz } from './types';

const gameQuestionTimers = [15, 20, 25, 30, 30];
const gameQuestionPoints = [500, 750, 1000, 1250, 1500];

function question({
  id,
  prompt,
  hint,
  explanation,
  options,
  orderIndex,
}: {
  id: string;
  prompt: string;
  hint: string;
  explanation: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  orderIndex: number;
}) {
  return {
    id,
    prompt,
    hint,
    explanation,
    timerSeconds: gameQuestionTimers[orderIndex],
    maxPoints: gameQuestionPoints[orderIndex],
    orderIndex,
    options: options.map((option, optionIndex) => ({
      ...option,
      orderIndex: optionIndex,
    })),
  };
}

export const demoGameQuizzes: DemoGameQuiz[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'Web Foundations Rally',
    topic: 'HTTP, semantic HTML, and responsive design',
    difficulty: null,
    questions: [
      question({
        id: '31000000-0000-4000-8000-000000000001',
        prompt: 'What does an HTTP 404 status usually mean?',
        hint: 'Think about a URL that does not lead to an available page.',
        explanation:
          'A 404 response means the server could not find the requested resource.',
        orderIndex: 0,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000001',
            text: 'The requested resource was not found.',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000002',
            text: 'The server processed the request successfully.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000003',
            text: 'The browser should follow a redirect.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000004',
            text: 'The server failed while handling the request.',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000002',
        prompt: 'What does DNS do when you open a website?',
        hint: 'It helps the browser locate the server named in a URL.',
        explanation:
          'DNS translates a host name into the network address needed to reach its server.',
        orderIndex: 1,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000005',
            text: 'Translates the host name into a network address.',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000006',
            text: 'Encrypts the connection between browser and server.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000007',
            text: 'Applies visual styles to the document.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000008',
            text: 'Stores the browser session data.',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000003',
        prompt: 'Which element is best for triggering an in-page action?',
        hint: 'Choose the element that already provides action semantics.',
        explanation:
          'A button represents an action and supplies the expected keyboard and accessibility behavior.',
        orderIndex: 2,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000009',
            text: '<button>',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000010',
            text: '<div>',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000011',
            text: '<span>',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000012',
            text: '<article>',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000004',
        prompt:
          'Which CSS rule keeps an image from overflowing a flexible container?',
        hint: 'The image should shrink with its container while keeping its proportions.',
        explanation:
          'A maximum width of 100% prevents overflow, and automatic height preserves the image ratio.',
        orderIndex: 3,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000013',
            text: 'max-width: 100%; height: auto;',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000014',
            text: 'width: 100vw; height: auto;',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000015',
            text: 'max-width: none; height: 100%;',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000016',
            text: 'position: fixed; inset: 0;',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000005',
        prompt: 'When should a responsive layout add a breakpoint?',
        hint: 'Base the decision on the interface, not a device label.',
        explanation:
          'Breakpoints should restore clarity or usability when the content no longer works well in the available space.',
        orderIndex: 4,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000017',
            text: 'When the content no longer remains clear or usable.',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000018',
            text: 'At every popular phone screen width.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000019',
            text: 'Only when the layout first appears on a desktop screen.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000020',
            text: 'Whenever a new card is added to the page.',
            isCorrect: false,
          },
        ],
      }),
    ],
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    title: 'Practical English Rally',
    topic: 'Clear questions, professional messages, and clear speech',
    difficulty: null,
    questions: [
      question({
        id: '31000000-0000-4000-8000-000000000006',
        prompt: 'Which question is closed and asks for confirmation?',
        hint: 'A closed question expects a specific fact or yes/no response.',
        explanation:
          'This question asks the listener to confirm whether a specific action happened.',
        orderIndex: 0,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000021',
            text: 'Did you submit the assignment yesterday?',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000022',
            text: 'What made that part difficult?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000023',
            text: 'Could you tell me where you are working?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000024',
            text: 'Where are you working?',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000007',
        prompt: 'Which sentence uses correct indirect-question word order?',
        hint: 'After the polite opening, use statement word order.',
        explanation:
          'Indirect questions keep the subject before the verb after the opening phrase.',
        orderIndex: 1,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000025',
            text: 'Do you know when the meeting starts?',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000026',
            text: 'Do you know when does the meeting start?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000027',
            text: 'Do you know when starts the meeting?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000028',
            text: 'Do you know when the meeting does start?',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000008',
        prompt: 'Which request gives the reader enough context?',
        hint: 'Look for a clear task, document, and deadline.',
        explanation:
          'The request identifies exactly what to review and when the response is needed.',
        orderIndex: 2,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000029',
            text: 'Can you check the introduction paragraph in my draft before Friday afternoon?',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000030',
            text: 'Can you check it?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000031',
            text: 'Can you help?',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000032',
            text: 'Is it okay?',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000009',
        prompt:
          'Which subject line is clearest for asking for outline feedback?',
        hint: 'A strong subject names both the topic and the intended action.',
        explanation:
          'This subject line tells the reader the document and the feedback action immediately.',
        orderIndex: 3,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000033',
            text: 'Feedback request for presentation outline',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000034',
            text: 'Question',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000035',
            text: 'Hello',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000036',
            text: 'Presentation',
            isCorrect: false,
          },
        ],
      }),
      question({
        id: '31000000-0000-4000-8000-000000000010',
        prompt:
          'Which speaking technique makes a long sentence easier to follow?',
        hint: 'Think about how listeners can process meaningful chunks of speech.',
        explanation:
          'Pausing between thought groups helps listeners follow the structure and meaning of a long sentence.',
        orderIndex: 4,
        options: [
          {
            id: '32000000-0000-4000-8000-000000000037',
            text: 'Pause between meaningful thought groups.',
            isCorrect: true,
          },
          {
            id: '32000000-0000-4000-8000-000000000038',
            text: 'Pause after every word.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000039',
            text: 'Speak as quickly as possible.',
            isCorrect: false,
          },
          {
            id: '32000000-0000-4000-8000-000000000040',
            text: 'Stress every word equally.',
            isCorrect: false,
          },
        ],
      }),
    ],
  },
];
