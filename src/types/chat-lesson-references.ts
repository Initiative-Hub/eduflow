export type ChatLessonReferenceData = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  markdown?: string;
  moduleTitle?: string | null;
};

export type ChatLessonReferenceUIPart = {
  type: 'data-lesson-reference';
  id?: string;
  data: ChatLessonReferenceData;
};
