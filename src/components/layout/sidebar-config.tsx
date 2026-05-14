import {
  BookOpen,
  ClipboardList,
  Files,
  LineChart,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import type { ReactElement } from 'react';

export type SidebarItem = {
  name: string;
  url: string;
  icon: ReactElement;
  exact?: boolean;
};

export const sidebarIconClassName =
  'size-5 fill-primary/60 text-primary/80 transition-colors group-hover/menu-button:fill-primary group-hover/menu-button:text-primary group-data-[active=true]/menu-button:fill-primary group-data-[active=true]/menu-button:text-primary';

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
      name: 'Question Bank',
      url: `/courses/${courseId}/question-bank`,
      icon: <ClipboardList className={iconCls} />,
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
