export const COURSE_SETTINGS_QUERY_KEY = (courseId: string) =>
  ['course', courseId, 'settings'] as const;

export const COURSE_VISIBILITY_OPTIONS = ['public', 'private'] as const;

export type CourseSettingsRole = 'COURSE_OWNER' | 'TEACHER' | 'STUDENT';

export type CourseVisibility = (typeof COURSE_VISIBILITY_OPTIONS)[number];

export type CourseSettingsCourse = {
  archivedAt: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isPublished: boolean;
  ownerId: string;
  title: string;
  updatedAt: string;
};

export type CourseSettingsMember = {
  email: string;
  id: string;
  image: string | null;
  name: string;
  role: CourseSettingsRole;
};

export type CourseSettingsResponse = {
  course: CourseSettingsCourse;
  currentUser: {
    isOwner: boolean;
    role: CourseSettingsRole;
  };
  transferMembers: CourseSettingsMember[];
};

export type CourseSettingsDraft = {
  description: string;
  title: string;
  visibility: CourseVisibility;
};

export type CourseSettingsUpdateInput = {
  description: string | null;
  isPublished: boolean;
  title: string;
};

export type CourseSettingsMutationResponse = {
  id: string;
  message: string;
};

export function getCourseSettingsInitials(
  name?: string | null,
  email?: string | null
) {
  const displayName = name || email || '';

  return (
    displayName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

export function getCourseSettingsDraft(
  settings: CourseSettingsResponse
): CourseSettingsDraft {
  return {
    description: settings.course.description ?? '',
    title: settings.course.title,
    visibility: settings.course.isPublished ? 'public' : 'private',
  };
}
