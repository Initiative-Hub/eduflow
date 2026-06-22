import { lessonDocument } from './lesson-document';
import type { DemoCourse } from './types';

export const practicalEnglishCommunicationCourse: DemoCourse = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Practical English Communication',
  description:
    'Everyday English practice for clearer conversations, confident speaking, effective writing, and professional communication.',
  isPublished: true,
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
          content: lessonDocument({
            title: 'Introducing Yourself',
            overview:
              'A useful introduction is short, relevant, and easy for another person to respond to. The best details depend on whether you are meeting a classmate, colleague, customer, interviewer, or new friend.',
            objectives: [
              'Give a clear introduction suited to the situation.',
              'Use natural follow-up questions to continue the exchange.',
              'Adjust formality without sounding memorised.',
            ],
            sections: [
              {
                heading: 'Choose relevant details',
                body: 'Begin with your name and add one or two details that connect to the setting, such as your role, field of study, hometown, or reason for attending. Too many facts at once make it difficult for the listener to choose a response.',
              },
              {
                heading: 'Match the level of formality',
                body: 'Professional settings often use complete phrases and role-related information, while casual settings allow contractions and personal interests. A warm tone and clear pace matter more than using unusually advanced vocabulary.',
              },
              {
                heading: 'Create a conversational opening',
                body: 'End with a simple question or shared observation instead of stopping after your name. Questions such as “How did you hear about this event?” give the other person an easy way to participate.',
              },
            ],
            practice:
              'Prepare a 20-second introduction for a new class and another for a job interview. Record both, then revise any detail or phrase that does not fit its audience.',
            takeaway:
              'An effective introduction offers just enough relevant information and opens a natural path for the other person to respond.',
          }),
        },
        {
          id: '21100000-0000-4000-8000-000000000002',
          title: 'Asking Clear Questions',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Asking Clear Questions',
            overview:
              'Clear questions help people exchange accurate information and avoid unnecessary back-and-forth. Good question choice depends on whether you need a detailed explanation, a specific fact, confirmation, or clarification.',
            objectives: [
              'Choose open, closed, and follow-up questions intentionally.',
              'Form direct and indirect questions accurately.',
              'Add enough context for the listener to answer efficiently.',
            ],
            sections: [
              {
                heading: 'Choose the question shape',
                body: 'Open questions beginning with what, how, or why invite detail, while yes-or-no questions confirm a narrow point. Follow-up questions test understanding and encourage the speaker to develop an important idea.',
              },
              {
                heading: 'Use natural word order',
                body: 'Direct questions often invert the subject and auxiliary verb, as in “Where are you working?” Indirect openings such as “Could you tell me…” use statement order afterward: “Could you tell me where you are working?”',
              },
              {
                heading: 'Be specific and courteous',
                body: 'Name the document, date, task, or decision you mean instead of relying on vague words such as it or that. Polite framing helps, but clarity should not be buried under a long apology.',
              },
            ],
            practice:
              'Rewrite five vague questions so each includes the necessary context. For two of them, create both a direct version and a more polite indirect version.',
            takeaway:
              'A clear question combines the right question type, accurate word order, and enough context for a useful answer.',
          }),
        },
        {
          id: '21100000-0000-4000-8000-000000000003',
          title: 'Active Listening and Follow-ups',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Active Listening and Follow-ups',
            overview:
              'Strong communication is not only about producing fluent sentences. Active listeners show attention, identify the speaker’s main point, and use short responses or questions to confirm and deepen understanding.',
            objectives: [
              'Recognise key ideas and supporting details while listening.',
              'Use brief response signals without interrupting.',
              'Paraphrase and ask follow-up questions to confirm meaning.',
            ],
            sections: [
              {
                heading: 'Listen for structure',
                body: 'Signal phrases such as first, however, the main reason, and as a result reveal how ideas connect. Focus on the speaker’s purpose and key nouns before trying to remember every individual word.',
              },
              {
                heading: 'Show attention naturally',
                body: 'Short signals such as “I see,” “right,” or “that makes sense” encourage the speaker without taking over. Their timing and tone should support the conversation rather than becoming repetitive or automatic.',
              },
              {
                heading: 'Check your interpretation',
                body: 'Paraphrasing with “So, you mean…” lets the speaker correct a misunderstanding early. A focused follow-up question then explores the part that matters instead of changing to a new topic too quickly.',
              },
            ],
            practice:
              'Listen to a two-minute interview without taking full notes. Write the main point, two details, one paraphrase, and one follow-up question you would ask the speaker.',
            takeaway:
              'Active listening turns attention into visible understanding through relevant response signals, paraphrases, and follow-up questions.',
          }),
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
          content: lessonDocument({
            title: 'Making Requests and Offers',
            overview:
              'Requests and offers are everyday tools for coordinating with other people. The wording should make the action clear while respecting the listener’s time, authority, and freedom to respond.',
            objectives: [
              'Make requests with an appropriate level of directness.',
              'Offer help in a specific and natural way.',
              'Accept, decline, and negotiate alternatives politely.',
            ],
            sections: [
              {
                heading: 'Scale the request',
                body: 'A small familiar request may use “Can you…?” while a larger or more formal request may use “Could you possibly…?” State the action and relevant deadline clearly so politeness does not make the task ambiguous.',
              },
              {
                heading: 'Make useful offers',
                body: 'Specific offers such as “Would you like me to review the first page?” are easier to accept than a general “Let me know if you need anything.” They show what help is available without assuming control.',
              },
              {
                heading: 'Respond with options',
                body: 'When accepting, confirm the key detail; when declining, give a brief reason if appropriate and suggest an alternative. Negotiation phrases such as “I can do Friday instead” keep the conversation productive.',
              },
            ],
            practice:
              'Write one request to a friend, one to a lecturer, and one to a colleague. Add an acceptance, a polite decline, and an alternative response for each situation.',
            takeaway:
              'Effective requests and offers balance precise action with language that fits the relationship and size of the favour.',
          }),
        },
        {
          id: '21200000-0000-4000-8000-000000000004',
          title: 'Directions, Plans, and Schedules',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Directions, Plans, and Schedules',
            overview:
              'Planning conversations combine locations, sequences, dates, and commitments. Clear reference points and confirmation questions prevent small misunderstandings from becoming missed meetings or wrong turns.',
            objectives: [
              'Give directions using landmarks and ordered steps.',
              'Propose and confirm times using natural expressions.',
              'Clarify changes to a shared plan.',
            ],
            sections: [
              {
                heading: 'Anchor directions',
                body: 'Begin from a shared location and use visible landmarks alongside left, right, across from, and past. Divide a longer route into a few stages and check that the listener recognises the next major point.',
              },
              {
                heading: 'Make time unambiguous',
                body: 'Include the day, date, time, and time zone when confusion is possible. Phrases such as “Does Tuesday at three work for you?” invite confirmation instead of presenting an assumption as a final plan.',
              },
              {
                heading: 'Confirm the final arrangement',
                body: 'Summarise the agreed place and time after alternatives have been discussed. If a plan changes, state what changed, what remains the same, and whether the other person needs to take action.',
              },
            ],
            practice:
              'Explain a route from a transport stop to a classroom, then arrange a study meeting with two possible times. Finish by writing one sentence that confirms the agreed plan.',
            takeaway:
              'Directions and schedules become reliable when they use shared reference points, ordered details, and explicit confirmation.',
          }),
        },
        {
          id: '21200000-0000-4000-8000-000000000005',
          title: 'Handling Misunderstandings',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Handling Misunderstandings',
            overview:
              'Misunderstandings are normal in communication, including between fluent speakers. Repair strategies let you pause, locate the unclear point, and rebuild shared meaning without embarrassment or blame.',
            objectives: [
              'Signal that a word, detail, or intention is unclear.',
              'Ask for repetition, examples, or rephrasing.',
              'Correct your own statement tactfully.',
            ],
            sections: [
              {
                heading: 'Identify the gap',
                body: 'Instead of saying only “I don’t understand,” name the part you missed: a date, term, instruction, or reason. A precise repair request makes it easier for the speaker to provide the missing information.',
              },
              {
                heading: 'Choose a repair strategy',
                body: 'Ask the speaker to repeat, slow down, spell a word, give an example, or say the idea another way. Paraphrasing what you understood also reveals exactly where your interpretations differ.',
              },
              {
                heading: 'Correct without blame',
                body: 'Phrases such as “Sorry, I meant…” and “I may not have explained that clearly” keep attention on the message. When correcting another person, soften the interruption and provide the accurate detail directly.',
              },
            ],
            practice:
              'Role-play a conversation with an unclear deadline and an unfamiliar word. Use two different repair strategies, then summarise the final meaning to confirm agreement.',
            takeaway:
              'Communication repair is a normal skill: identify the unclear point, request the right support, and confirm the shared meaning.',
          }),
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
          content: lessonDocument({
            title: 'Pronunciation and Clear Speech',
            overview:
              'Clear speech depends on rhythm, stress, sound distinctions, and pacing rather than trying to erase an accent. The goal is to help listeners identify important words and follow the shape of the message.',
            objectives: [
              'Use word and sentence stress to highlight meaning.',
              'Practise difficult sound contrasts in context.',
              'Improve clarity through chunking and controlled pace.',
            ],
            sections: [
              {
                heading: 'Stress carries information',
                body: 'English words usually have one prominent syllable, and sentences emphasise content words or contrasts. Moving sentence stress can change what sounds new or important even when every word stays the same.',
              },
              {
                heading: 'Train contrasts, not isolated perfection',
                body: 'Practise sound pairs that affect your intelligibility using short words and then full phrases. Recording and comparing examples helps you notice mouth position and voicing more reliably than silent repetition.',
              },
              {
                heading: 'Speak in thought groups',
                body: 'Pause between meaningful chunks rather than after every word. A steady pace with clear thought groups is easier to follow and often sounds more confident than speaking quickly without emphasis.',
              },
            ],
            practice:
              'Mark the stressed words and thought groups in a short paragraph, record it twice, and compare clarity. Choose one difficult sound contrast for five minutes of phrase-level practice.',
            takeaway:
              'Clear pronunciation prioritises meaningful stress, useful sound contrasts, and a pace organised into thought groups.',
          }),
        },
        {
          id: '21300000-0000-4000-8000-000000000002',
          title: 'Telling Stories and Experiences',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Telling Stories and Experiences',
            overview:
              'Short stories make conversations memorable and allow speakers to explain experiences, lessons, and opinions. A listener needs orientation, a meaningful sequence, and a clear reason the story matters.',
            objectives: [
              'Open a story with essential context.',
              'Sequence events using consistent tense and transitions.',
              'End with a result, reaction, or reflection.',
            ],
            sections: [
              {
                heading: 'Set the scene efficiently',
                body: 'Introduce when and where the story happened, who was involved, and what normal situation was about to change. Include only the background details the listener needs to understand the central event.',
              },
              {
                heading: 'Move through the events',
                body: 'Use past tenses consistently and transitions such as at first, suddenly, meanwhile, and eventually. Emphasise the turning point instead of giving equal time to every minor action.',
              },
              {
                heading: 'Make the ending meaningful',
                body: 'Explain what happened as a result and how you or others reacted. A final reflection—what changed, what you learned, or why the event was surprising—shows the purpose of telling the story.',
              },
            ],
            practice:
              'Plan a 90-second story about a small challenge using five notes: setting, normal situation, turning point, result, and reflection. Tell it without reading complete sentences.',
            takeaway:
              'A compelling short story guides the listener from essential context through a turning point to a meaningful result.',
          }),
        },
        {
          id: '21300000-0000-4000-8000-000000000003',
          title: 'Expressing and Discussing Opinions',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Expressing and Discussing Opinions',
            overview:
              'Productive discussion connects an opinion to reasons and evidence while leaving room for other perspectives. Language for agreement and disagreement helps participants examine ideas without turning differences into personal conflict.',
            objectives: [
              'State an opinion with an appropriate level of certainty.',
              'Support a claim with reasons and examples.',
              'Agree, qualify, and disagree respectfully.',
            ],
            sections: [
              {
                heading: 'Calibrate your claim',
                body: 'Phrases such as “In my experience,” “It seems,” and “I’m convinced” signal different levels of certainty. Matching confidence to evidence makes your position sound thoughtful rather than weak or overly absolute.',
              },
              {
                heading: 'Build a support chain',
                body: 'Give a clear reason, explain why it matters, and add an example or observation. This structure allows listeners to evaluate the argument and respond to a specific point instead of only accepting or rejecting a conclusion.',
              },
              {
                heading: 'Disagree with the idea',
                body: 'Acknowledge a valid part before presenting a concern: “I agree that it is faster, but I’m not sure it is more reliable.” Ask questions when the difference may come from assumptions or definitions.',
              },
            ],
            practice:
              'Choose a familiar topic and prepare one opinion, two reasons, and one example. Respond to an opposing view using partial agreement and a focused follow-up question.',
            takeaway:
              'Strong discussion combines a well-supported position with language that keeps different perspectives open for examination.',
          }),
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
          content: lessonDocument({
            title: 'Building Strong Paragraphs',
            overview:
              'A paragraph develops one main idea through connected sentences. Readers understand it quickly when the topic is clear, the evidence is relevant, and each sentence creates a logical path to the next.',
            objectives: [
              'Write a focused topic sentence.',
              'Develop an idea with explanation and evidence.',
              'Use transitions to show relationships between sentences.',
            ],
            sections: [
              {
                heading: 'Control the main idea',
                body: 'A topic sentence identifies the paragraph’s subject and makes a specific point about it. If a supporting sentence does not explain, prove, illustrate, or qualify that point, it probably belongs elsewhere.',
              },
              {
                heading: 'Develop, do not repeat',
                body: 'Supporting sentences should move the idea forward with reasons, examples, facts, definitions, or comparison. Rephrasing the topic sentence several times creates length without adding understanding.',
              },
              {
                heading: 'Create cohesion',
                body: 'Transitions such as however, for example, and as a result make relationships explicit, while repeated key terms and careful pronoun references keep the subject visible. Use connectors only when the relationship is real.',
              },
            ],
            practice:
              'Write a paragraph arguing for one improvement to your study routine. Underline the topic sentence, label each supporting sentence’s role, and remove any sentence that does not develop the central idea.',
            takeaway:
              'A strong paragraph makes one focused claim and develops it through relevant, logically connected support.',
          }),
        },
        {
          id: '21400000-0000-4000-8000-000000000002',
          title: 'Clear Emails and Messages',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Clear Emails and Messages',
            overview:
              'Effective messages respect the reader’s attention. They make the purpose, required action, relevant context, and timing easy to identify while using a tone appropriate to the relationship.',
            objectives: [
              'Write informative subject lines and openings.',
              'Organise requests and context for quick reading.',
              'Close with a clear next step and suitable tone.',
            ],
            sections: [
              {
                heading: 'Lead with purpose',
                body: 'A useful subject line names the topic and action, while the opening states why you are writing. Readers should not need to search several paragraphs before learning that a deadline changed or a decision is required.',
              },
              {
                heading: 'Make action visible',
                body: 'Separate background from the requested action and include the exact date, file, or decision involved. Bullets help when several parallel items must be scanned, but a single simple request is often clearer as a sentence.',
              },
              {
                heading: 'Use concise professional tone',
                body: 'Courtesy does not require long apologies or elaborate formal phrases. Thank the reader where appropriate, state a realistic next step, and reread the message for accidental urgency, vagueness, or blame.',
              },
            ],
            practice:
              'Rewrite a long message requesting feedback on an assignment. Give it a specific subject line, place the request in the first two sentences, and include a clear deadline and attachment reference.',
            takeaway:
              'A clear message lets the reader understand its purpose and next action in one quick pass.',
          }),
        },
        {
          id: '21200000-0000-4000-8000-000000000002',
          title: 'Editing for Clarity',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Editing for Clarity',
            overview:
              'Editing separates idea generation from reader-focused revision. A useful editing process checks structure first, then sentence clarity, word choice, and finally surface correctness such as punctuation and spelling.',
            objectives: [
              'Revise structure before polishing individual words.',
              'Replace vague or inflated language with precise alternatives.',
              'Proofread systematically for common errors.',
            ],
            sections: [
              {
                heading: 'Edit from large to small',
                body: 'Confirm that the purpose, order, and paragraph focus work before adjusting commas. Polishing a sentence that will later be removed wastes time and can make writers reluctant to improve the larger structure.',
              },
              {
                heading: 'Strengthen sentences',
                body: 'Prefer concrete subjects and active verbs where they improve understanding. Remove repeated ideas, empty openings, unnecessary nominalisations, and modifiers that make a claim longer without making it more accurate.',
              },
              {
                heading: 'Proofread with a method',
                body: 'Read slowly for one error category at a time, use tools as prompts rather than unquestioned answers, and read aloud to hear missing words or awkward rhythm. A final format check catches headings, spacing, and attachment mistakes.',
              },
            ],
            practice:
              'Revise a 150-word draft in three passes: organisation, sentence clarity, and correctness. Save each version and write one sentence explaining the highest-impact change.',
            takeaway:
              'Efficient editing moves from purpose and structure toward sentences and correctness, always judging changes from the reader’s perspective.',
          }),
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
          content: lessonDocument({
            title: 'Giving a Short Presentation',
            overview:
              'A short presentation succeeds when the audience can follow one central message from opening to conclusion. Clear organisation and deliberate delivery matter more than fitting every fact onto the slides.',
            objectives: [
              'Structure a presentation around one audience outcome.',
              'Use signposting language to guide listeners.',
              'Deliver notes with clear pace, emphasis, and eye contact.',
            ],
            sections: [
              {
                heading: 'Design the message',
                body: 'Decide what the audience should understand or do afterward, then select two or three supporting points. An opening should establish relevance and preview the route rather than beginning with a long personal disclaimer.',
              },
              {
                heading: 'Guide the audience',
                body: 'Phrases such as “First, let’s look at…,” “The key difference is…,” and “To summarise…” tell listeners where they are. Slides should reinforce this structure with readable evidence instead of duplicating a complete script.',
              },
              {
                heading: 'Rehearse for communication',
                body: 'Practise aloud with brief notes, mark important words for emphasis, and time the complete talk. Rehearsal helps you recover naturally after a pause and notice explanations that are clear on paper but difficult to say.',
              },
            ],
            practice:
              'Prepare a three-minute presentation explaining one useful idea from this course. Use no more than three slides, record one rehearsal, and revise the opening or conclusion based on playback.',
            takeaway:
              'A confident short presentation gives the audience one clear destination and guides them there through focused points and practised delivery.',
          }),
        },
        {
          id: '21500000-0000-4000-8000-000000000002',
          title: 'Participating in Meetings',
          orderIndex: 1,
          content: lessonDocument({
            title: 'Participating in Meetings',
            overview:
              'Meeting participation involves entering the discussion, contributing a relevant point, responding to others, and confirming decisions. Useful language helps speakers do this without dominating or disappearing from the conversation.',
            objectives: [
              'Enter and redirect a discussion politely.',
              'State concise updates, concerns, and proposals.',
              'Confirm decisions, owners, and next actions.',
            ],
            sections: [
              {
                heading: 'Join at the right moment',
                body: 'Use phrases such as “Could I add something here?” or connect directly to the previous point. Beginning with the relevance of your contribution helps others understand why you are taking the floor.',
              },
              {
                heading: 'Make contributions actionable',
                body: 'Structure updates around current status, important evidence, blockers, and the decision or support needed. When raising a concern, pair it with a question or possible next step so discussion can move forward.',
              },
              {
                heading: 'Close the loop',
                body: 'Before changing topics or ending, summarise what was decided, who owns each action, and the deadline. Asking “Have I captured that correctly?” gives participants a final chance to repair different interpretations.',
              },
            ],
            practice:
              'Simulate a project meeting with an update, a disagreement, and a decision. Practise entering once, asking one clarifying question, and giving a final action summary.',
            takeaway:
              'Effective meeting language connects contributions to the discussion and turns decisions into clearly owned next actions.',
          }),
        },
        {
          id: '21500000-0000-4000-8000-000000000003',
          title: 'Building an Independent Practice Plan',
          orderIndex: 2,
          content: lessonDocument({
            title: 'Building an Independent Practice Plan',
            overview:
              'Communication improves through repeated use, specific feedback, and reflection. A sustainable plan focuses on a small real-world outcome and combines input, deliberate practice, and opportunities to communicate with other people.',
            objectives: [
              'Set a specific communication goal with observable evidence.',
              'Balance listening, reading, speaking, and writing practice.',
              'Review progress and adjust strategies regularly.',
            ],
            sections: [
              {
                heading: 'Define a real outcome',
                body: 'Replace a broad goal such as “be fluent” with an outcome such as “give a clear five-minute project update and answer two questions.” A concrete situation reveals the vocabulary, structure, pronunciation, and interaction skills to practise.',
              },
              {
                heading: 'Create a repeatable cycle',
                body: 'Study a useful model, notice its language, produce your own version, receive feedback, and try again. Short frequent sessions connected to real tasks are easier to sustain than occasional study without a defined purpose.',
              },
              {
                heading: 'Track evidence, not mood',
                body: 'Save recordings and drafts, note recurring difficulties, and compare performance over several weeks. Confidence may change daily, but evidence shows which strategies are working and what the next practice target should be.',
              },
            ],
            practice:
              'Choose one four-week communication outcome. Schedule three short weekly activities, identify one source of feedback, and define the recording, draft, or completed task that will demonstrate progress.',
            takeaway:
              'Independent progress comes from a concrete goal, a repeatable practice-and-feedback cycle, and regular review of real evidence.',
          }),
        },
      ],
    },
  ],
};
