import { readMarkdownLessonDocument } from './lesson-document';
import { assignmentDocument } from './assignment-document';
import type { DemoCourse } from './types';

export const practicalEnglishCommunicationCourse: DemoCourse = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Practical English Communication',
  description:
    'Everyday English practice for clearer conversations, confident speaking, effective writing, and professional communication.',
  isPublished: true,
  assignments: [
    {
      id: '22000000-0000-4000-8000-000000000001',
      title: 'Personal Introduction Recording',
      content: assignmentDocument(
        'Prepare a two-minute spoken introduction for a new class or workplace.',
        'Submit your recording together with a short reflection on your vocabulary, pronunciation, and confidence.'
      ),
      dueAt: new Date('2030-09-20T23:59:00.000Z'),
      maxPoints: 50,
    },
    {
      id: '22000000-0000-4000-8000-000000000002',
      title: 'Professional Email',
      content: assignmentDocument(
        'Write a clear professional email requesting a change to a meeting schedule.',
        'Use an appropriate subject line, polite tone, clear paragraphs, and a specific call to action.'
      ),
      dueAt: new Date('2030-10-05T23:59:00.000Z'),
      maxPoints: 75,
    },
    {
      id: '22000000-0000-4000-8000-000000000003',
      title: 'Short Presentation Plan',
      content: assignmentDocument(
        'Create a plan for a five-minute presentation about a topic you know well.',
        'Include your opening, key points, transitions, conclusion, and two questions for the audience.'
      ),
      dueAt: null,
      maxPoints: 100,
    },
  ],
  modules: [
    {
      id: '21000000-0000-4000-8000-000000000001',
      title: 'Conversation Foundations',
      orderIndex: 0,
      lessons: [
        {
          id: '21100000-0000-4000-8000-000000000001',
          title: 'Introducing Yourself',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/practical-english-communication/conversation-foundations/introducing-yourself.md`
          ),
        },
        {
          id: '21100000-0000-4000-8000-000000000002',
          title: 'Asking Clear Questions',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/practical-english-communication/conversation-foundations/asking-clear-questions.md`
          ),
        },
        {
          id: '21100000-0000-4000-8000-000000000003',
          title: 'Active Listening and Follow-ups',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/practical-english-communication/conversation-foundations/active-listening-and-follow-ups.md`
          ),
        },
      ],
    },
    {
      id: '21000000-0000-4000-8000-000000000002',
      title: 'Everyday Situations',
      orderIndex: 1,
      lessons: [
        {
          id: '21200000-0000-4000-8000-000000000003',
          title: 'Making Requests and Offers',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/practical-english-communication/everyday-situations/making-requests-and-offers.md`
          ),
        },
        {
          id: '21200000-0000-4000-8000-000000000004',
          title: 'Directions, Plans, and Schedules',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/everyday-situations/directions-plans-and-schedules.md'
          ),
        },
        {
          id: '21200000-0000-4000-8000-000000000005',
          title: 'Handling Misunderstandings',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/everyday-situations/handling-misunderstandings.md'
          ),
        },
      ],
    },
    {
      id: '21000000-0000-4000-8000-000000000003',
      title: 'Speaking with Confidence',
      orderIndex: 2,
      lessons: [
        {
          id: '21300000-0000-4000-8000-000000000001',
          title: 'Pronunciation and Clear Speech',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/speaking-with-confidence/pronunciation-and-clear-speech.md'
          ),
        },
        {
          id: '21300000-0000-4000-8000-000000000002',
          title: 'Telling Stories and Experiences',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/speaking-with-confidence/telling-stories-and-experiences.md'
          ),
        },
        {
          id: '21300000-0000-4000-8000-000000000003',
          title: 'Expressing and Discussing Opinions',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/speaking-with-confidence/expressing-and-discussing-opinions.md'
          ),
        },
      ],
    },
    {
      id: '21000000-0000-4000-8000-000000000004',
      title: 'Confident Writing',
      orderIndex: 3,
      lessons: [
        {
          id: '21200000-0000-4000-8000-000000000001',
          title: 'Building Strong Paragraphs',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/confident-writing/building-strong-paragraphs.md'
          ),
        },
        {
          id: '21400000-0000-4000-8000-000000000002',
          title: 'Clear Emails and Messages',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/confident-writing/clear-emails-and-messages.md'
          ),
        },
        {
          id: '21200000-0000-4000-8000-000000000002',
          title: 'Editing for Clarity',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/confident-writing/editing-for-clarity.md'
          ),
        },
      ],
    },
    {
      id: '21000000-0000-4000-8000-000000000005',
      title: 'Academic and Professional Communication',
      orderIndex: 4,
      lessons: [
        {
          id: '21500000-0000-4000-8000-000000000001',
          title: 'Giving a Short Presentation',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/academic-and-professional-communication/giving-a-short-presentation.md'
          ),
        },
        {
          id: '21500000-0000-4000-8000-000000000002',
          title: 'Participating in Meetings',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/academic-and-professional-communication/participating-in-meetings.md'
          ),
        },
        {
          id: '21500000-0000-4000-8000-000000000003',
          title: 'Building an Independent Practice Plan',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            'content/practical-english-communication/academic-and-professional-communication/building-an-independent-practice-plan.md'
          ),
        },
      ],
    },
  ],
};
