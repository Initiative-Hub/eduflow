import { readMarkdownLessonDocument } from './lesson-document';
import { assignmentDocument } from './assignment-document';
import type { DemoCourse } from './types';

export const foundationsWebDevelopmentCourse: DemoCourse = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Foundations of Web Development',
  description:
    'A practical introduction to HTML, CSS, JavaScript, accessible interfaces, and shipping a complete website.',
  isPublished: true,
  assignments: [
    {
      id: '12000000-0000-4000-8000-000000000001',
      title: 'Semantic HTML Audit',
      content: assignmentDocument(
        'Review a small website and identify opportunities to improve its semantic HTML structure.',
        'Submit a short report explaining your changes and how they improve accessibility.'
      ),
      dueAt: new Date('2030-09-15T23:59:00.000Z'),
      maxPoints: 100,
    },
    {
      id: '12000000-0000-4000-8000-000000000002',
      title: 'Responsive Landing Page',
      content: assignmentDocument(
        'Build a responsive landing page using semantic HTML and modern CSS layout techniques.',
        'Include a desktop layout, a mobile layout, and a short README describing your design decisions.'
      ),
      dueAt: new Date('2030-10-15T23:59:00.000Z'),
      maxPoints: 100,
    },
    {
      id: '12000000-0000-4000-8000-000000000003',
      title: 'Capstone Website Proposal',
      content: assignmentDocument(
        'Plan a complete website for a clearly defined audience and purpose.',
        'Submit a proposal containing the target audience, content structure, visual direction, and implementation plan.'
      ),
      dueAt: null,
      maxPoints: 150,
    },
  ],
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
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/html-and-the-web/how-the-web-works.md`
          ),
        },
        {
          id: '11100000-0000-4000-8000-000000000002',
          title: 'Semantic HTML',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/html-and-the-web/semantic-html.md`
          ),
        },
        {
          id: '11100000-0000-4000-8000-000000000003',
          title: 'Forms and Accessible Inputs',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/html-and-the-web/forms-and-accessible-inputs.md`
          ),
        },
      ],
    },
    {
      id: '11000000-0000-4000-8000-000000000002',
      title: 'CSS Foundations',
      orderIndex: 1,
      lessons: [
        {
          id: '11200000-0000-4000-8000-000000000003',
          title: 'The Cascade and Selectors',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/css-foundations/cascade-and-selectors.md`
          ),
        },
        {
          id: '11200000-0000-4000-8000-000000000004',
          title: 'The Box Model and Layout',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/css-foundations/box-model-and-layout.md`
          ),
        },
        {
          id: '11200000-0000-4000-8000-000000000001',
          title: 'Responsive Layouts',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/css-foundations/responsive-layouts.md`
          ),
        },
      ],
    },
    {
      id: '11000000-0000-4000-8000-000000000003',
      title: 'JavaScript Essentials',
      orderIndex: 2,
      lessons: [
        {
          id: '11300000-0000-4000-8000-000000000001',
          title: 'Values, Variables, and Functions',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/javascript-essentials/values-variables-and-functions.md`
          ),
        },
        {
          id: '11200000-0000-4000-8000-000000000002',
          title: 'DOM and JavaScript Events',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/javascript-essentials/dom-and-javascript-events.md`
          ),
        },
        {
          id: '11300000-0000-4000-8000-000000000003',
          title: 'Asynchronous JavaScript and APIs',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/javascript-essentials/asynchronous-javascript-and-apis.md`
          ),
        },
      ],
    },
    {
      id: '11000000-0000-4000-8000-000000000004',
      title: 'Quality and Collaboration',
      orderIndex: 3,
      lessons: [
        {
          id: '11400000-0000-4000-8000-000000000001',
          title: 'Git and Collaborative Workflows',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/quality-and-collaboration/git-and-collaborative-workflows.md`
          ),
        },
        {
          id: '11400000-0000-4000-8000-000000000002',
          title: 'Debugging and Testing',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/quality-and-collaboration/debugging-and-testing.md`
          ),
        },
        {
          id: '11400000-0000-4000-8000-000000000003',
          title: 'Accessibility and Performance',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/quality-and-collaboration/accessibility-and-performance.md`
          ),
        },
      ],
    },
    {
      id: '11000000-0000-4000-8000-000000000005',
      title: 'Capstone Website',
      orderIndex: 4,
      lessons: [
        {
          id: '11500000-0000-4000-8000-000000000001',
          title: 'Planning the Experience',
          orderIndex: 0,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/capstone-website/planning-the-experience.md`
          ),
        },
        {
          id: '11500000-0000-4000-8000-000000000002',
          title: 'Building and Reviewing',
          orderIndex: 1,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/capstone-website/building-and-reviewing.md`
          ),
        },
        {
          id: '11500000-0000-4000-8000-000000000003',
          title: 'Deployment and Continuous Improvement',
          orderIndex: 2,
          content: readMarkdownLessonDocument(
            `content/foundations-web-development/capstone-website/deployment-and-continuous-improvement.md`
          ),
        },
      ],
    },
  ],
};
