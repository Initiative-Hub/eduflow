import type { ReactElement } from 'react';
import {
  BookOpen,
  FileText,
  Files,
  LineChart,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';

export type SidebarItem = {
  name: string;
  url: string;
  icon: ReactElement;
  exact?: boolean;
};

/**
 * Shared icon className applied to every sidebar icon.
 * Centralised here so AppSidebar and any future sidebar variant stay in sync.
 */
export const sidebarIconClassName =
  'size-5 fill-primary/60 text-primary/80 transition-colors group-hover/menu-button:fill-primary group-hover/menu-button:text-primary group-data-[active=true]/menu-button:fill-primary group-data-[active=true]/menu-button:text-primary';

/**
 * Returns the course-level navigation items for the given courseId.
 * Previously duplicated verbatim in `AppSidebar` and the now-deleted
 * `CourseMenuSidebar` component.
 */
export function getCourseNavItems(
  courseId: string,
  iconCls: string
): SidebarItem[] {
  return [
    {
      name: 'Modules',
      url: `/courses/${courseId}`,
      icon: <BookOpen className={iconCls} />,
      exact: true,
    },
    {
      name: 'Course AI Chat',
      url: `/courses/${courseId}/chat`,
      icon: <MessageSquare className={iconCls} />,
    },
    {
      name: 'Assessments',
      url: `/courses/${courseId}/assessments`,
      icon: <FileText className={iconCls} />,
    },
    {
      name: 'Files',
      url: `/courses/${courseId}/files`,
      icon: <Files className={iconCls} />,
    },
    {
      name: 'Members',
      url: `/courses/${courseId}/members`,
      icon: <Users className={iconCls} />,
    },
    {
      name: 'Analytics',
      url: `/courses/${courseId}/analytics`,
      icon: <LineChart className={iconCls} />,
    },
    {
      name: 'Settings',
      url: `/courses/${courseId}/settings`,
      icon: <Settings className={iconCls} />,
    },
  ];
}
