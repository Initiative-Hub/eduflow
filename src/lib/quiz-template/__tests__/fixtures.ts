/**
 * Test fixtures for the quiz template library.
 * These mock data constants are used exclusively for testing and seeding.
 * They are NOT exported from the production barrel (index.ts).
 */

import type {
  MockCourse,
  QuestionBankEntry,
  QuizDefinition,
} from '../quiz-schema';

// ─── Constants ───────────────────────────────────────────────────────────────

const COURSE_ID = 'd89eb3f1-3224-4c1a-a924-8df7619c84a6';

// ─── Mock Course Data ────────────────────────────────────────────────────────

export const MOCK_COURSE: MockCourse = {
  id: COURSE_ID,
  title: 'Introduction to Biology',
  description:
    'A comprehensive introductory course covering cell biology, genetics, and ecology.',
  modules: [
    {
      id: 'mod-bio-001',
      title: 'Cell Biology Fundamentals',
      orderIndex: 0,
      lessons: [
        {
          id: 'les-cell-001',
          title: 'Cell Structure and Organelles',
          orderIndex: 0,
          content: {
            type: 'doc',
            content:
              'Cells are the basic structural and functional units of all living organisms.',
          },
        },
        {
          id: 'les-cell-002',
          title: 'Cell Membrane and Transport',
          orderIndex: 1,
          content: {
            type: 'doc',
            content:
              'The cell membrane is a selectively permeable phospholipid bilayer.',
          },
        },
      ],
    },
    {
      id: 'mod-bio-002',
      title: 'Genetics and DNA',
      orderIndex: 1,
      lessons: [
        {
          id: 'les-gen-001',
          title: 'DNA Structure and Replication',
          orderIndex: 0,
          content: {
            type: 'doc',
            content: 'DNA is a double-helix molecule composed of nucleotides.',
          },
        },
        {
          id: 'les-gen-002',
          title: 'Mendelian Genetics and Inheritance',
          orderIndex: 1,
          content: {
            type: 'doc',
            content:
              'Gregor Mendel established the fundamental laws of inheritance.',
          },
        },
        {
          id: 'les-gen-003',
          title: 'Gene Expression and Protein Synthesis',
          orderIndex: 2,
          content: {
            type: 'doc',
            content: 'Gene expression involves transcription and translation.',
          },
        },
      ],
    },
    {
      id: 'mod-bio-003',
      title: 'Ecology and Ecosystems',
      orderIndex: 2,
      lessons: [
        {
          id: 'les-eco-001',
          title: 'Food Chains and Energy Flow',
          orderIndex: 0,
          content: {
            type: 'doc',
            content:
              'Energy flows through ecosystems via food chains and food webs.',
          },
        },
        {
          id: 'les-eco-002',
          title: 'Biodiversity and Conservation',
          orderIndex: 1,
          content: {
            type: 'doc',
            content:
              'Biodiversity refers to the variety of life at all levels.',
          },
        },
      ],
    },
  ],
  questions: [],
  quizzes: [],
};

// ─── Mock Questions (Question Bank) ──────────────────────────────────────────

export const MOCK_QUESTIONS: QuestionBankEntry[] = [
  {
    id: 'q-seed-001',
    courseId: COURSE_ID,
    lessonId: 'les-cell-001',
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    prompt: 'What is the powerhouse of the cell?',
    answerData: {
      type: 'multiple_choice',
      prompt: 'What is the powerhouse of the cell?',
      options: [
        { id: 'a', text: 'Mitochondria', isCorrect: true },
        { id: 'b', text: 'Nucleus', isCorrect: false },
        { id: 'c', text: 'Ribosome', isCorrect: false },
        { id: 'd', text: 'Golgi apparatus', isCorrect: false },
      ],
      explanation:
        "Mitochondria are known as the powerhouse of the cell because they generate most of the cell's supply of ATP.",
    },
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'q-seed-002',
    courseId: COURSE_ID,
    lessonId: 'les-cell-001',
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    prompt: 'Which organelle is responsible for protein synthesis?',
    answerData: {
      type: 'multiple_choice',
      prompt: 'Which organelle is responsible for protein synthesis?',
      options: [
        { id: 'a', text: 'Ribosome', isCorrect: true },
        { id: 'b', text: 'Lysosome', isCorrect: false },
        { id: 'c', text: 'Vacuole', isCorrect: false },
        { id: 'd', text: 'Endoplasmic reticulum', isCorrect: false },
      ],
      explanation:
        'Ribosomes are the cellular structures responsible for translating mRNA into proteins.',
    },
    createdAt: '2026-04-01T10:05:00Z',
    updatedAt: '2026-04-01T10:05:00Z',
  },
  {
    id: 'q-seed-003',
    courseId: COURSE_ID,
    lessonId: 'les-cell-001',
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    prompt: 'What is the primary function of the Golgi apparatus?',
    answerData: {
      type: 'multiple_choice',
      prompt: 'What is the primary function of the Golgi apparatus?',
      options: [
        { id: 'a', text: 'Modifying and packaging proteins', isCorrect: true },
        { id: 'b', text: 'Producing energy', isCorrect: false },
        { id: 'c', text: 'Storing DNA', isCorrect: false },
        { id: 'd', text: 'Digesting waste', isCorrect: false },
      ],
      explanation:
        'The Golgi apparatus modifies, packages, and ships proteins and lipids to their final destinations.',
    },
    createdAt: '2026-04-01T10:10:00Z',
    updatedAt: '2026-04-01T10:10:00Z',
  },
  {
    id: 'q-seed-004',
    courseId: COURSE_ID,
    lessonId: 'les-cell-002',
    category: 'SELECTION_BASED',
    subType: 'TRUE_FALSE',
    prompt:
      'Osmosis is the movement of water molecules from a region of lower solute concentration to a region of higher solute concentration through a semipermeable membrane.',
    answerData: {
      type: 'true_false',
      prompt:
        'Osmosis is the movement of water molecules from a region of lower solute concentration to a region of higher solute concentration through a semipermeable membrane.',
      correctAnswer: true,
      explanation:
        'This is true. Osmosis specifically refers to the passive movement of water across a semipermeable membrane.',
    },
    createdAt: '2026-04-02T09:00:00Z',
    updatedAt: '2026-04-02T09:00:00Z',
  },
  {
    id: 'q-seed-005',
    courseId: COURSE_ID,
    lessonId: 'les-cell-002',
    category: 'SELECTION_BASED',
    subType: 'TRUE_FALSE',
    prompt: 'Active transport requires no energy input from the cell.',
    answerData: {
      type: 'true_false',
      prompt: 'Active transport requires no energy input from the cell.',
      correctAnswer: false,
      explanation:
        'This is false. Active transport requires ATP energy to move substances against their concentration gradient.',
    },
    createdAt: '2026-04-02T09:05:00Z',
    updatedAt: '2026-04-02T09:05:00Z',
  },
  {
    id: 'q-seed-006',
    courseId: COURSE_ID,
    lessonId: 'les-cell-001',
    category: 'SELECTION_BASED',
    subType: 'MATCHING',
    prompt: 'Match each organelle with its primary function:',
    answerData: {
      type: 'matching',
      prompt: 'Match each organelle with its primary function:',
      leftItems: [
        { id: 'l1', text: 'Mitochondria' },
        { id: 'l2', text: 'Ribosome' },
        { id: 'l3', text: 'Nucleus' },
        { id: 'l4', text: 'Lysosome' },
      ],
      rightItems: [
        { id: 'r1', text: 'Protein synthesis' },
        { id: 'r2', text: 'Energy production (ATP)' },
        { id: 'r3', text: 'Stores genetic material' },
        { id: 'r4', text: 'Digests cellular waste' },
      ],
      correctPairs: [
        { leftId: 'l1', rightId: 'r2' },
        { leftId: 'l2', rightId: 'r1' },
        { leftId: 'l3', rightId: 'r3' },
        { leftId: 'l4', rightId: 'r4' },
      ],
      explanation: 'Each organelle has a specialized function within the cell.',
    },
    createdAt: '2026-04-03T11:00:00Z',
    updatedAt: '2026-04-03T11:00:00Z',
  },
  {
    id: 'q-seed-007',
    courseId: COURSE_ID,
    lessonId: 'les-cell-002',
    category: 'SELECTION_BASED',
    subType: 'ORDERING',
    prompt:
      'Arrange the types of transport from least to most energy-requiring:',
    answerData: {
      type: 'ordering',
      prompt:
        'Arrange the types of transport from least to most energy-requiring:',
      items: [
        { id: 't1', text: 'Simple diffusion' },
        { id: 't2', text: 'Facilitated diffusion' },
        { id: 't3', text: 'Osmosis' },
        { id: 't4', text: 'Active transport' },
      ],
      correctOrder: ['t1', 't3', 't2', 't4'],
      explanation:
        'Simple diffusion and osmosis require no energy. Facilitated diffusion uses proteins but no ATP. Active transport requires ATP.',
    },
    createdAt: '2026-04-03T11:30:00Z',
    updatedAt: '2026-04-03T11:30:00Z',
  },
  {
    id: 'q-seed-008',
    courseId: COURSE_ID,
    lessonId: 'les-gen-001',
    category: 'OPEN_ENDED',
    subType: 'FILL_IN_THE_BLANK',
    prompt:
      'DNA is composed of {{sugar}} sugar, a {{group}} group, and a nitrogenous {{base}}.',
    answerData: {
      type: 'fill_in_the_blank',
      promptTemplate:
        'DNA is composed of {{sugar}} sugar, a {{group}} group, and a nitrogenous {{base}}.',
      blanks: [
        { id: 'sugar', acceptableAnswers: ['deoxyribose'] },
        { id: 'group', acceptableAnswers: ['phosphate'] },
        { id: 'base', acceptableAnswers: ['base'] },
      ],
      explanation:
        'Each nucleotide in DNA consists of a deoxyribose sugar, a phosphate group, and one of four nitrogenous bases.',
    },
    createdAt: '2026-04-04T14:00:00Z',
    updatedAt: '2026-04-04T14:00:00Z',
  },
  {
    id: 'q-seed-009',
    courseId: COURSE_ID,
    lessonId: 'les-gen-001',
    category: 'OPEN_ENDED',
    subType: 'FILL_IN_THE_BLANK',
    prompt:
      'The two strands of DNA are held together by {{bonds}} bonds between complementary {{bases}}.',
    answerData: {
      type: 'fill_in_the_blank',
      promptTemplate:
        'The two strands of DNA are held together by {{bonds}} bonds between complementary {{bases}}.',
      blanks: [
        { id: 'bonds', acceptableAnswers: ['hydrogen'] },
        { id: 'bases', acceptableAnswers: ['bases', 'base pairs'] },
      ],
      explanation:
        'Hydrogen bonds form between complementary base pairs (A-T and G-C) to hold the two DNA strands together.',
    },
    createdAt: '2026-04-04T14:30:00Z',
    updatedAt: '2026-04-04T14:30:00Z',
  },
  {
    id: 'q-seed-010',
    courseId: COURSE_ID,
    lessonId: 'les-gen-002',
    category: 'OPEN_ENDED',
    subType: 'DRAG_AND_DROP',
    prompt: 'Complete the sentence about Mendelian genetics:',
    answerData: {
      type: 'drag-and-drop',
      prompt: 'Complete the sentence about Mendelian genetics:',
      sentenceTemplate:
        'A {{trait1}} allele masks the expression of a {{trait2}} allele. When both alleles are the same, the organism is {{zygosity}}.',
      zones: [
        { id: 'trait1', label: 'dominant trait' },
        { id: 'trait2', label: 'recessive trait' },
        { id: 'zygosity', label: 'zygosity' },
      ],
      items: [
        { id: 'dominant', text: 'dominant' },
        { id: 'recessive', text: 'recessive' },
        { id: 'homozygous', text: 'homozygous' },
        { id: 'heterozygous', text: 'heterozygous' },
      ],
      correctMapping: {
        trait1: 'dominant',
        trait2: 'recessive',
        zygosity: 'homozygous',
      },
      explanation:
        'In Mendelian genetics, dominant alleles mask recessive ones. An organism with two identical alleles is homozygous.',
    },
    createdAt: '2026-04-05T08:00:00Z',
    updatedAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'q-seed-011',
    courseId: COURSE_ID,
    lessonId: 'les-gen-003',
    category: 'OPEN_ENDED',
    subType: 'ESSAY',
    prompt:
      'Explain the process of transcription and translation in protein synthesis. Include the roles of mRNA, tRNA, and ribosomes.',
    answerData: {
      type: 'essay',
      prompt:
        'Explain the process of transcription and translation in protein synthesis. Include the roles of mRNA, tRNA, and ribosomes.',
      minWords: 80,
      maxWords: 400,
      allowAttachments: false,
      deliveryOption: 'immediate',
      explanation:
        'Transcription occurs in the nucleus where RNA polymerase creates mRNA from a DNA template. Translation occurs at ribosomes.',
    },
    createdAt: '2026-04-06T10:00:00Z',
    updatedAt: '2026-04-06T10:00:00Z',
  },
  {
    id: 'q-seed-012',
    courseId: COURSE_ID,
    lessonId: 'les-eco-001',
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    prompt:
      'Approximately what percentage of energy is transferred from one trophic level to the next?',
    answerData: {
      type: 'multiple_choice',
      prompt:
        'Approximately what percentage of energy is transferred from one trophic level to the next?',
      options: [
        { id: 'a', text: '10%', isCorrect: true },
        { id: 'b', text: '50%', isCorrect: false },
        { id: 'c', text: '90%', isCorrect: false },
        { id: 'd', text: '25%', isCorrect: false },
      ],
      explanation:
        'Only about 10% of energy is transferred between trophic levels. The remaining 90% is lost as heat.',
    },
    createdAt: '2026-04-07T09:00:00Z',
    updatedAt: '2026-04-07T09:00:00Z',
  },
  {
    id: 'q-seed-013',
    courseId: COURSE_ID,
    lessonId: 'les-eco-001',
    category: 'SELECTION_BASED',
    subType: 'ORDERING',
    prompt:
      'Arrange the following organisms in a food chain from producer to top consumer:',
    answerData: {
      type: 'ordering',
      prompt:
        'Arrange the following organisms in a food chain from producer to top consumer:',
      items: [
        { id: 'o1', text: 'Grass' },
        { id: 'o2', text: 'Grasshopper' },
        { id: 'o3', text: 'Frog' },
        { id: 'o4', text: 'Hawk' },
      ],
      correctOrder: ['o1', 'o2', 'o3', 'o4'],
      explanation:
        'Grass is the producer, grasshopper is the primary consumer, frog is the secondary consumer, and hawk is the top consumer.',
    },
    createdAt: '2026-04-07T09:30:00Z',
    updatedAt: '2026-04-07T09:30:00Z',
  },
  {
    id: 'q-seed-014',
    courseId: COURSE_ID,
    lessonId: 'les-eco-002',
    category: 'OPEN_ENDED',
    subType: 'ESSAY',
    prompt:
      'Discuss three major threats to biodiversity and propose one conservation strategy for each threat.',
    answerData: {
      type: 'essay',
      prompt:
        'Discuss three major threats to biodiversity and propose one conservation strategy for each threat.',
      minWords: 100,
      maxWords: 500,
      allowAttachments: true,
      deliveryOption: 'teacher-review',
      allowTeacherRubric: true,
      explanation:
        'Major threats include habitat destruction, climate change, and invasive species.',
    },
    createdAt: '2026-04-08T14:00:00Z',
    updatedAt: '2026-04-08T14:00:00Z',
  },
  {
    id: 'q-seed-015',
    courseId: COURSE_ID,
    lessonId: null,
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    prompt:
      'Which scientist is credited with discovering the structure of DNA?',
    answerData: {
      type: 'multiple_choice',
      prompt:
        'Which scientist is credited with discovering the structure of DNA?',
      options: [
        { id: 'a', text: 'Watson and Crick', isCorrect: true },
        { id: 'b', text: 'Gregor Mendel', isCorrect: false },
        { id: 'c', text: 'Charles Darwin', isCorrect: false },
        { id: 'd', text: 'Louis Pasteur', isCorrect: false },
      ],
      explanation:
        'Watson and Crick discovered the double-helix structure of DNA in 1953.',
    },
    createdAt: '2026-04-09T10:00:00Z',
    updatedAt: '2026-04-09T10:00:00Z',
  },
  {
    id: 'q-seed-016',
    courseId: COURSE_ID,
    lessonId: 'les-gen-002',
    category: 'SELECTION_BASED',
    subType: 'MATCHING',
    prompt: 'Match each genetic term with its definition:',
    answerData: {
      type: 'matching',
      prompt: 'Match each genetic term with its definition:',
      leftItems: [
        { id: 'l1', text: 'Genotype' },
        { id: 'l2', text: 'Phenotype' },
        { id: 'l3', text: 'Allele' },
        { id: 'l4', text: 'Locus' },
      ],
      rightItems: [
        { id: 'r1', text: 'Observable physical trait' },
        { id: 'r2', text: 'Genetic makeup of an organism' },
        { id: 'r3', text: 'Position of a gene on a chromosome' },
        { id: 'r4', text: 'Alternative form of a gene' },
      ],
      correctPairs: [
        { leftId: 'l1', rightId: 'r2' },
        { leftId: 'l2', rightId: 'r1' },
        { leftId: 'l3', rightId: 'r4' },
        { leftId: 'l4', rightId: 'r3' },
      ],
      explanation:
        'Genotype is the genetic makeup, phenotype is the observable trait, allele is a gene variant, and locus is the gene position.',
    },
    createdAt: '2026-04-09T11:00:00Z',
    updatedAt: '2026-04-09T11:00:00Z',
  },
  {
    id: 'q-seed-017',
    courseId: COURSE_ID,
    lessonId: 'les-eco-001',
    category: 'OPEN_ENDED',
    subType: 'DRAG_AND_DROP',
    prompt: 'Complete the sentence about energy flow in ecosystems:',
    answerData: {
      type: 'drag-and-drop',
      prompt: 'Complete the sentence about energy flow in ecosystems:',
      sentenceTemplate:
        '{{producers}} convert sunlight into chemical energy. {{consumers}} obtain energy by eating other organisms. {{decomposers}} break down dead matter.',
      zones: [
        { id: 'producers', label: 'first organisms' },
        { id: 'consumers', label: 'eating organisms' },
        { id: 'decomposers', label: 'recycling organisms' },
      ],
      items: [
        { id: 'prod', text: 'Producers' },
        { id: 'cons', text: 'Consumers' },
        { id: 'decomp', text: 'Decomposers' },
        { id: 'parasites', text: 'Parasites' },
      ],
      correctMapping: {
        producers: 'prod',
        consumers: 'cons',
        decomposers: 'decomp',
      },
      explanation:
        'Producers convert sunlight into chemical energy. Consumers eat other organisms. Decomposers break down dead matter.',
    },
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-04-10T08:00:00Z',
  },
];

// ─── Mock Quizzes ────────────────────────────────────────────────────────────

export const MOCK_QUIZZES: QuizDefinition[] = [
  {
    id: 'quiz-seed-001',
    courseId: COURSE_ID,
    lessonIds: ['les-cell-001'],
    title: 'Cell Organelles Review',
    description: 'Test your knowledge of cell organelles and their functions.',
    category: 'SELECTION_BASED',
    subType: 'MULTIPLE_CHOICE',
    deliveryMode: 'INSTANT_FEEDBACK',
    selectionMethod: 'HAND_PICK',
    questionCount: 3,
    questions: [
      MOCK_QUESTIONS[0].answerData,
      MOCK_QUESTIONS[1].answerData,
      MOCK_QUESTIONS[2].answerData,
    ],
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-10T09:00:00Z',
  },
  {
    id: 'quiz-seed-002',
    courseId: COURSE_ID,
    lessonIds: ['les-cell-002'],
    title: 'Cell Transport Concepts',
    description: 'Review quiz on cell membrane transport mechanisms.',
    category: 'SELECTION_BASED',
    subType: 'TRUE_FALSE',
    deliveryMode: 'POST_QUIZ_REVIEW',
    selectionMethod: 'HAND_PICK',
    questionCount: 2,
    questions: [MOCK_QUESTIONS[3].answerData, MOCK_QUESTIONS[4].answerData],
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'quiz-seed-003',
    courseId: COURSE_ID,
    lessonIds: ['les-gen-001'],
    title: 'DNA Structure Fill-in-the-Blank',
    description: 'Complete sentences about DNA structure and composition.',
    category: 'OPEN_ENDED',
    subType: 'FILL_IN_THE_BLANK',
    deliveryMode: 'INSTANT_FEEDBACK',
    selectionMethod: 'HAND_PICK',
    questionCount: 2,
    questions: [MOCK_QUESTIONS[7].answerData, MOCK_QUESTIONS[8].answerData],
    createdAt: '2026-04-11T09:00:00Z',
    updatedAt: '2026-04-11T09:00:00Z',
  },
  {
    id: 'quiz-seed-004',
    courseId: COURSE_ID,
    lessonIds: ['les-eco-001'],
    title: 'Ecology Ordering Challenge',
    description: 'Arrange ecological concepts in the correct order.',
    category: 'SELECTION_BASED',
    subType: 'ORDERING',
    deliveryMode: 'POST_QUIZ_REVIEW',
    selectionMethod: 'HAND_PICK',
    questionCount: 1,
    questions: [MOCK_QUESTIONS[12].answerData],
    createdAt: '2026-04-11T10:00:00Z',
    updatedAt: '2026-04-11T10:00:00Z',
  },
];

// Populate the course mock with questions and quizzes
MOCK_COURSE.questions = MOCK_QUESTIONS;
MOCK_COURSE.quizzes = MOCK_QUIZZES;
