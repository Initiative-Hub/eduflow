import { lessonDocument } from './lesson-document';
import type { DemoCourse } from './types';

export const foundationsWebDevelopmentCourse: DemoCourse = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Foundations of Web Development',
  description:
    'A practical introduction to HTML, CSS, JavaScript, accessible interfaces, and shipping a complete website.',
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
          content: lessonDocument({
            title: 'How the Web Works',
            overview:
              'Every website begins with a conversation between a browser and a server. Understanding that exchange makes HTML, CSS, JavaScript, hosting, and debugging feel like connected parts of one system rather than unrelated tools.',
            objectives: [
              'Explain how a URL leads to an HTTP request and response.',
              'Distinguish the roles of HTML, CSS, JavaScript, browsers, and servers.',
              'Use browser developer tools to inspect a loaded page.',
            ],
            sections: [
              {
                heading: 'From URL to response',
                body: 'A URL identifies a resource and the protocol used to request it. The browser resolves the domain name, opens a network connection, sends an HTTP request, and receives a response containing a status code, headers, and often an HTML document.',
              },
              {
                heading: 'Building the page',
                body: 'After receiving HTML, the browser parses it into a document tree and requests linked resources such as stylesheets, scripts, fonts, and images. CSS determines presentation, while JavaScript can read and change the page after it loads.',
              },
              {
                heading: 'Reading the network',
                body: 'Developer tools reveal each request, its timing, response status, and payload. A 404 usually means a resource was not found, while a 500 indicates a server-side failure; these clues narrow the search when a page is incomplete.',
              },
            ],
            practice:
              'Open the Network panel for a familiar website, reload the page, and identify the main HTML request plus one stylesheet, script, and image. Record each resource type and response status.',
            takeaway:
              'A web page is assembled from requests and responses: HTML provides structure, CSS provides presentation, and JavaScript provides behaviour.',
          }),
        },
        {
          id: '11100000-0000-4000-8000-000000000002',
          title: 'Semantic HTML',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Semantic HTML',
            overview:
              'Semantic HTML describes what content means, not merely how it should look. Clear document structure improves accessibility, search discovery, maintainability, and collaboration between developers.',
            objectives: [
              'Choose elements based on meaning and document structure.',
              'Organise a page with headings and landmark elements.',
              'Recognise when a generic div or span is appropriate.',
            ],
            sections: [
              {
                heading: 'Meaning before appearance',
                body: 'Elements such as article, nav, main, button, and time communicate purpose to browsers and assistive technologies. Styling can change appearance, but it cannot fully replace the meaning and built-in behaviour of the correct element.',
              },
              {
                heading: 'A navigable document outline',
                body: 'A page should have one clear primary heading followed by logically nested sections. Landmark elements help screen-reader users jump between navigation, main content, complementary information, and the footer without reading everything in order.',
              },
              {
                heading: 'Native controls first',
                body: 'A native button already supports keyboard focus, activation, and accessibility semantics. Recreating it with a clickable div adds avoidable work and often produces an interface that excludes keyboard or assistive-technology users.',
              },
            ],
            practice:
              'Rewrite a page made only from div elements using header, nav, main, article, section, button, and footer where appropriate. Then verify that heading levels remain logical.',
            takeaway:
              'Select HTML elements for their meaning and built-in behaviour; use CSS to control how those elements look.',
          }),
        },
        {
          id: '11100000-0000-4000-8000-000000000003',
          title: 'Forms and Accessible Inputs',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Forms and Accessible Inputs',
            overview:
              'Forms turn a document into a two-way interaction. A well-designed form makes the requested information obvious, accepts input efficiently, and explains errors without forcing the user to guess.',
            objectives: [
              'Associate labels, inputs, hints, and errors correctly.',
              'Choose input types that match the requested data.',
              'Design forms that work with keyboards and assistive technology.',
            ],
            sections: [
              {
                heading: 'Labels create understanding',
                body: 'Every control needs a persistent label connected with for and id attributes or by nesting the input inside the label. Placeholder text may offer an example, but it disappears during typing and should never be the only description.',
              },
              {
                heading: 'Use the browser platform',
                body: 'Input types such as email, date, number, and password provide useful keyboards, validation hints, and autofill behaviour. Name attributes identify submitted values, while autocomplete tokens help users complete familiar fields quickly.',
              },
              {
                heading: 'Helpful validation',
                body: 'Validation should happen at a useful moment and explain how to recover. Keep entered values after an error, place messages near the relevant field, and provide a summary when several fields require attention.',
              },
            ],
            practice:
              'Create a small registration form with name, email, password, and agreement fields. Complete it once using only the keyboard and revise any confusing focus order, labels, or error messages.',
            takeaway:
              'Accessible forms combine correct native controls, explicit labels, sensible input types, and actionable feedback.',
          }),
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
          content: lessonDocument({
            title: 'The Cascade and Selectors',
            overview:
              'CSS resolves many possible style declarations into the final value used for each property. Learning that decision process prevents specificity battles and makes stylesheets easier to extend.',
            objectives: [
              'Explain inheritance, specificity, source order, and importance.',
              'Write selectors that are clear and appropriately scoped.',
              'Diagnose overridden declarations with developer tools.',
            ],
            sections: [
              {
                heading: 'How declarations compete',
                body: 'The cascade considers origin and importance before comparing selector specificity and source order. A later declaration only wins when competing rules have equal priority, so moving code is not a reliable cure for every override.',
              },
              {
                heading: 'Selectors as contracts',
                body: 'Class selectors provide reusable styling hooks without tying presentation to a specific element or document location. Deeply nested selectors are fragile because small markup changes can unexpectedly break their match.',
              },
              {
                heading: 'Inheritance and shared values',
                body: 'Properties such as color and font-family commonly inherit, while layout properties usually do not. Custom properties can carry semantic design values through the tree and make related components respond consistently.',
              },
            ],
            practice:
              'Create three competing rules for one element, predict the winning declaration, and confirm the result in the Styles panel. Reduce specificity without changing the visual result.',
            takeaway:
              'Predictable CSS comes from understanding the cascade and choosing low-friction selectors, not from adding increasingly powerful overrides.',
          }),
        },
        {
          id: '11200000-0000-4000-8000-000000000004',
          title: 'The Box Model and Layout',
          orderIndex: 1,
          content: lessonDocument({
            title: 'The Box Model and Layout',
            overview:
              'Every rendered element occupies a box made from content, padding, border, and margin. Layout systems then arrange those boxes according to the available space and relationships between items.',
            objectives: [
              'Calculate an element’s rendered dimensions.',
              'Choose normal flow, Flexbox, or Grid for a layout problem.',
              'Use spacing intentionally without brittle offsets.',
            ],
            sections: [
              {
                heading: 'Sizing the box',
                body: 'With content-box sizing, declared width excludes padding and border; border-box includes them. Applying border-box broadly makes component dimensions easier to reason about and prevents padding from unexpectedly expanding a layout.',
              },
              {
                heading: 'Flow, Flexbox, and Grid',
                body: 'Normal flow is ideal for documents, Flexbox handles alignment along one main axis, and Grid coordinates rows and columns. Start with the natural flow and introduce a layout system only where a relationship requires it.',
              },
              {
                heading: 'Spacing as a system',
                body: 'Gap expresses spacing between related children without attaching margins to each item. A small spacing scale creates visual rhythm and avoids arbitrary values that make similar components feel subtly inconsistent.',
              },
            ],
            practice:
              'Build a card row with Grid or Flexbox, add consistent internal padding, and use gap between cards. Resize the container and inspect how each box responds before adding any fixed widths.',
            takeaway:
              'Understand each box first, then choose the simplest layout system that expresses the relationship between boxes.',
          }),
        },
        {
          id: '11200000-0000-4000-8000-000000000001',
          title: 'Responsive Layouts',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Responsive Layouts',
            overview:
              'Responsive design lets content adapt to changing space, input methods, and user preferences. The goal is not to target every device but to preserve hierarchy and usability across a continuous range of conditions.',
            objectives: [
              'Build fluid layouts with flexible sizing.',
              'Choose breakpoints based on content rather than device labels.',
              'Test responsive behaviour beyond changing viewport width.',
            ],
            sections: [
              {
                heading: 'Start fluid',
                body: 'Relative units, max-width constraints, wrapping, and modern layout systems solve many responsive problems without media queries. Images should generally shrink within their container instead of forcing horizontal scrolling.',
              },
              {
                heading: 'Let content choose breakpoints',
                body: 'Add a breakpoint when the current composition becomes crowded or hard to read, then make the smallest useful adjustment. Device-specific breakpoints age poorly because screen sizes and window configurations continually change.',
              },
              {
                heading: 'Test real constraints',
                body: 'Check zoom, long translated text, keyboard focus, reduced motion, and touch-sized targets alongside viewport width. A layout that merely fits can still be unusable if content is clipped or controls become difficult to activate.',
              },
            ],
            practice:
              'Turn a fixed three-column layout into a fluid composition that moves from one to three columns when space permits. Test it at 200% zoom and with one unusually long heading.',
            takeaway:
              'Responsive interfaces adapt from the content outward, using fluid defaults and focused breakpoints only when the design needs them.',
          }),
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
          content: lessonDocument({
            title: 'Values, Variables, and Functions',
            overview:
              'JavaScript programs transform values over time. Variables give those values meaningful names, while functions package repeatable decisions into units that can be understood, tested, and reused.',
            objectives: [
              'Work with common primitive and object values.',
              'Choose clear variable and function boundaries.',
              'Trace inputs, transformations, and returned outputs.',
            ],
            sections: [
              {
                heading: 'Know the value you have',
                body: 'Strings, numbers, booleans, null, and undefined behave differently from arrays and objects. Clear code checks assumptions at boundaries and avoids relying on surprising implicit conversions between types.',
              },
              {
                heading: 'Names communicate intent',
                body: 'Use const by default and let when reassignment expresses a real state change. A descriptive name such as totalPrice carries more meaning than a comment explaining an abbreviation several lines later.',
              },
              {
                heading: 'Small transformations',
                body: 'A focused function accepts explicit inputs and returns a useful result. Separating calculation from display or network activity makes the core behaviour easier to test and reuse in different contexts.',
              },
            ],
            practice:
              'Write a function that accepts an array of prices and a tax rate, then returns subtotal, tax, and total values. Test empty input and decimal values before displaying the result.',
            takeaway:
              'Reliable JavaScript starts with clear values, honest names, and functions whose inputs and outputs are easy to follow.',
          }),
        },
        {
          id: '11200000-0000-4000-8000-000000000002',
          title: 'DOM and JavaScript Events',
          orderIndex: 1,
          content: lessonDocument({
            title: 'DOM and JavaScript Events',
            overview:
              'The Document Object Model gives JavaScript a structured view of the page. Events report meaningful changes, allowing an interface to react to clicks, typing, form submission, focus, and many other interactions.',
            objectives: [
              'Select and update DOM elements safely.',
              'Handle events without blocking native browser behaviour unnecessarily.',
              'Provide visible and accessible feedback after an interaction.',
            ],
            sections: [
              {
                heading: 'The page as a tree',
                body: 'DOM nodes reflect the nested structure of HTML and expose properties, attributes, and methods. Prefer targeted updates such as changing text or toggling a class instead of rebuilding large sections for a small state change.',
              },
              {
                heading: 'Events carry context',
                body: 'An event listener receives an object describing the event target, type, and relevant input details. Event bubbling allows a parent to manage repeated child interactions through delegation when that pattern simplifies the code.',
              },
              {
                heading: 'Feedback closes the loop',
                body: 'Disable repeated submissions while work is pending, announce errors near their source, and show a clear success state. An interaction is incomplete if the application changes internally but the user cannot perceive the result.',
              },
            ],
            practice:
              'Build a small task list that adds items through a form and marks them complete through delegated click handling. Ensure the form works from the keyboard and rejects blank tasks visibly.',
            takeaway:
              'Use DOM updates and events to create a clear cycle of user action, application response, and perceivable feedback.',
          }),
        },
        {
          id: '11300000-0000-4000-8000-000000000003',
          title: 'Asynchronous JavaScript and APIs',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Asynchronous JavaScript and APIs',
            overview:
              'Network requests and other delayed operations finish later than the surrounding code. Promises and async functions let an application remain responsive while it waits and make success, loading, and failure explicit states.',
            objectives: [
              'Explain what a Promise represents.',
              'Use async and await with structured error handling.',
              'Design loading, empty, success, and error states for API data.',
            ],
            sections: [
              {
                heading: 'Work that finishes later',
                body: 'A Promise represents a future result that may be fulfilled or rejected. Await pauses the current async function without freezing the browser, allowing other events and rendering work to continue.',
              },
              {
                heading: 'HTTP success is not automatic',
                body: 'Fetch rejects for network failures but not for every unsuccessful HTTP status. Check the response status, validate the returned shape, and convert technical failures into messages that tell the user what they can do next.',
              },
              {
                heading: 'Model every state',
                body: 'A data-driven view needs a useful loading state, an intentional empty state, the successful result, and a recoverable error state. Prevent stale or duplicate requests from overwriting newer user choices.',
              },
            ],
            practice:
              'Request a small public JSON resource and render its records. Add a loading indicator, an empty result message, an error message, and a retry action before styling the successful list.',
            takeaway:
              'Asynchronous code is reliable when delayed work and every possible UI state are handled deliberately.',
          }),
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
          content: lessonDocument({
            title: 'Git and Collaborative Workflows',
            overview:
              'Version control preserves the history of a project and gives collaborators a shared language for proposing, reviewing, and integrating changes. Good Git habits make experimentation safer and decisions easier to understand later.',
            objectives: [
              'Describe commits, branches, merges, and remote repositories.',
              'Create focused commits with useful messages.',
              'Resolve simple conflicts without discarding another person’s work.',
            ],
            sections: [
              {
                heading: 'Commits tell a story',
                body: 'A commit should represent one coherent change and include a message that explains its purpose. Small intentional commits are easier to review, revert, and combine than snapshots containing unrelated work.',
              },
              {
                heading: 'Branches isolate change',
                body: 'A branch provides a movable line of development where a feature or fix can evolve independently. Pull requests make that work visible for automated checks, discussion, and review before it joins the shared branch.',
              },
              {
                heading: 'Conflicts need judgement',
                body: 'A merge conflict means Git cannot safely choose between overlapping edits. Read both versions, understand the intended final behaviour, combine them deliberately, and run relevant checks before completing the merge.',
              },
            ],
            practice:
              'Create a feature branch, make two focused commits, and compare it with the main branch. Introduce a controlled text conflict and resolve it while preserving the intent of both edits.',
            takeaway:
              'Git is most valuable when history is clear, branches stay focused, and conflicts are resolved through understanding rather than guesswork.',
          }),
        },
        {
          id: '11400000-0000-4000-8000-000000000002',
          title: 'Debugging and Testing',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Debugging and Testing',
            overview:
              'Debugging is a disciplined search for the difference between expected and observed behaviour. Tests preserve what you learn by turning important expectations into repeatable checks.',
            objectives: [
              'Reduce a bug to a small reproducible case.',
              'Use logs, breakpoints, and browser tools to test hypotheses.',
              'Write focused tests around durable behaviour.',
            ],
            sections: [
              {
                heading: 'Observe before changing',
                body: 'Record the exact steps, inputs, environment, and visible result before editing code. Reproduction separates a real pattern from an assumption and gives you a stable way to judge whether a fix works.',
              },
              {
                heading: 'Test one hypothesis',
                body: 'Inspect values at boundaries, pause execution near the failure, and change one variable at a time. Random edits can hide the original cause and create new behaviour that is even harder to explain.',
              },
              {
                heading: 'Protect the behaviour',
                body: 'A focused automated test describes what should remain true from a user or system perspective. Prefer testing meaningful outputs and state transitions over internal implementation details that may change during refactoring.',
              },
            ],
            practice:
              'Choose a small broken function, write a test that reproduces its incorrect result, and watch the test fail. Apply the smallest correction, rerun the test, and add one boundary case.',
            takeaway:
              'Debug with evidence, fix the cause, and preserve the expected behaviour with a test that would catch the regression.',
          }),
        },
        {
          id: '11400000-0000-4000-8000-000000000003',
          title: 'Accessibility and Performance',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Accessibility and Performance',
            overview:
              'Accessible and fast interfaces reduce barriers between people and their goals. Both qualities improve when teams use the browser platform well, prioritise essential content, and measure real user experience.',
            objectives: [
              'Identify common keyboard, contrast, and naming barriers.',
              'Explain how loading and rendering affect perceived speed.',
              'Prioritise improvements using evidence rather than intuition.',
            ],
            sections: [
              {
                heading: 'Access is a system quality',
                body: 'Keyboard access, visible focus, meaningful labels, text contrast, zoom support, and reduced-motion preferences should work together. Automated audits catch useful patterns, but manual navigation reveals whether a task is genuinely usable.',
              },
              {
                heading: 'Deliver the important experience first',
                body: 'Large images, scripts, fonts, and third-party tools compete for bandwidth and processing time. Compress media, avoid unnecessary client code, and reserve space for content so loading does not cause disruptive layout shifts.',
              },
              {
                heading: 'Measure and prioritise',
                body: 'Use browser audits and real measurements to locate bottlenecks, then connect each finding to user impact. Fixing a severe keyboard trap or slow primary action matters more than chasing a perfect score with no practical benefit.',
              },
            ],
            practice:
              'Audit one page using only the keyboard and a performance recording. List the three highest-impact barriers, implement one improvement, and compare the experience before and after.',
            takeaway:
              'Accessibility and performance are shared measures of how efficiently different users can reach the content and actions they need.',
          }),
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
          content: lessonDocument({
            title: 'Planning the Experience',
            overview:
              'A strong website begins with a clear audience, purpose, and content hierarchy. Planning these decisions early gives design and code a shared direction while leaving room to learn during implementation.',
            objectives: [
              'Define a specific audience and primary user goal.',
              'Organise content into a clear information hierarchy.',
              'Translate requirements into a small implementation plan.',
            ],
            sections: [
              {
                heading: 'Start with the outcome',
                body: 'Describe who the site serves, what they need, and the most important action they should complete. A narrow problem statement helps reject decorative ideas that compete with the core experience.',
              },
              {
                heading: 'Structure the content',
                body: 'Inventory required content, group related information, and order it from essential to supporting detail. Sketching the hierarchy in plain text often exposes missing content before visual design makes changes expensive.',
              },
              {
                heading: 'Plan thin vertical slices',
                body: 'Break work into small complete outcomes, such as one responsive page with real navigation and accessible controls. Completing a simple end-to-end path early reduces integration risk and creates something testable.',
              },
            ],
            practice:
              'Write a one-paragraph project brief, create a content outline, and sketch a low-fidelity mobile and desktop layout. Mark the primary action and the evidence users need before taking it.',
            takeaway:
              'Planning aligns audience, content, design, and implementation around one clear experience before details multiply.',
          }),
        },
        {
          id: '11500000-0000-4000-8000-000000000002',
          title: 'Building and Reviewing',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Building and Reviewing',
            overview:
              'Capstone implementation combines structure, presentation, interaction, and quality checks in short feedback loops. Building one complete path at a time keeps the project usable while it grows.',
            objectives: [
              'Implement a responsive page from semantic structure outward.',
              'Review work against requirements and user tasks.',
              'Use feedback to make focused revisions.',
            ],
            sections: [
              {
                heading: 'Build in layers',
                body: 'Begin with meaningful HTML and readable source order, add layout and visual hierarchy, then introduce JavaScript only where interaction requires it. Each layer should leave the essential content understandable.',
              },
              {
                heading: 'Review the task, not the screenshot',
                body: 'Check whether a user can find information, understand controls, complete the main action, and recover from mistakes. Compare implementation with requirements while also testing realistic content and input.',
              },
              {
                heading: 'Turn feedback into decisions',
                body: 'Record the observed problem, its impact, and the proposed change before editing. Group feedback by severity and shared cause so one thoughtful revision can solve several related symptoms.',
              },
            ],
            practice:
              'Implement the primary page and ask another person to complete its main task without guidance. Observe where they hesitate, choose the highest-impact issue, and revise the experience.',
            takeaway:
              'Build complete slices, review real tasks, and let evidence guide each revision rather than polishing isolated details too early.',
          }),
        },
        {
          id: '11500000-0000-4000-8000-000000000003',
          title: 'Deployment and Continuous Improvement',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Deployment and Continuous Improvement',
            overview:
              'Deployment makes a project available in a real environment where configuration, caching, network conditions, and user behaviour may differ from local development. Shipping is the start of a learning cycle, not the end of the work.',
            objectives: [
              'Prepare a website for a production deployment.',
              'Verify critical behaviour in the deployed environment.',
              'Create a practical backlog for future improvement.',
            ],
            sections: [
              {
                heading: 'Prepare the release',
                body: 'Confirm production configuration, environment variable names, asset paths, metadata, error handling, and repository status. Keep credentials outside source control and document the setup another developer would need.',
              },
              {
                heading: 'Verify what users receive',
                body: 'After deployment, test primary routes, forms, keyboard navigation, responsive layouts, and failure states on the public URL. Production checks catch case-sensitive paths, missing variables, and network assumptions that local tools can hide.',
              },
              {
                heading: 'Learn after launch',
                body: 'Collect direct feedback and lightweight evidence about failed tasks, slow pages, and unclear content. Convert observations into prioritised improvements with a defined user impact instead of an endless list of unranked ideas.',
              },
            ],
            practice:
              'Create a release checklist, deploy the capstone, and run a short smoke test from a different browser or device. Record one immediate fix and two lower-priority improvements.',
            takeaway:
              'A responsible deployment pairs careful release preparation with production verification and an evidence-based improvement loop.',
          }),
        },
      ],
    },
  ],
};
