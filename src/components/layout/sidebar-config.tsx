'use client';

import {
  Archive,
  Award,
  BookOpen,
  ClipboardList,
  Cloud,
  Files,
  GraduationCap,
  Languages,
  LineChart,
  MessageSquare,
  PenLine,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

export type SidebarItem = {
  name: string;
  url: string;
  icon: ReactElement;
  isActive: (pathname: string) => boolean;
};

export const sidebarIconClassName =
  'size-5 text-primary/80 transition-colors group-data-[active=true]/menu-button:text-primary group-hover/menu-button:text-primary ';

function isExactMatch(pathname: string, url: string) {
  return pathname === url;
}

export function getAssistantNavItems(
  t: ReturnType<typeof useTranslations>
): SidebarItem[] {
  return [
    {
      name: t('aiChat'),
      url: '/',
      icon: <MessageSquare className={sidebarIconClassName} />,
      isActive: (pathname) => pathname === '/' || pathname.startsWith('/chat'),
    },
    {
      name: t('yourInventory'),
      url: '/inventory',
      icon: <Archive className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/inventory'),
    },
    {
      name: t('socraticTutor'),
      url: '/socratic',
      icon: <GraduationCap className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/socratic'),
    },
    {
      name: t('englishAssistant'),
      url: '/english',
      icon: <Languages className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/english'),
    },
    {
      name: t('writingAssistant'),
      url: '/writing',
      icon: <PenLine className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/writing'),
    },
    {
      name: t('studyAssistant'),
      url: '/study',
      icon: <BookOpen className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/study'),
    },
  ];
}

export function getSettingNavItems(
  t: ReturnType<typeof useTranslations>
): SidebarItem[] {
  return [
    {
      name: t('settingsProfile'),
      url: '/profile',
      icon: <User className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/profile'),
    },
    {
      name: t('settingsAcademicContext'),
      url: '/settings/academic-context',
      icon: <School className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, '/settings/academic-context'),
    },
    {
      name: t('settingsSystemSettings'),
      url: '/settings',
      icon: <Settings className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/settings'),
    },
    {
      name: t('settingsAiPreferences'),
      url: '/settings/ai-preferences',
      icon: <Sparkles className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, '/settings/ai-preferences'),
    },
    {
      name: t('settingsIntegrations'),
      url: '/settings/integrations',
      icon: <Cloud className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/settings/integrations'),
    },
  ];
}

export function getAdminNavItems(
  t: ReturnType<typeof useTranslations>
): SidebarItem[] {
  return [
    {
      name: t('adminUserManagement'),
      url: '/admin/users',
      icon: <UserCog className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/admin/users'),
    },
    {
      name: t('adminRoles'),
      url: '/admin/roles',
      icon: <ShieldCheck className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/admin/roles'),
    },
  ];
}

export function getCourseNavItems(
  courseId: string,
  t: ReturnType<typeof useTranslations>
): SidebarItem[] {
  return [
    {
      name: t('courseModules'),
      url: `/courses/${courseId}`,
      icon: <BookOpen className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, `/courses/${courseId}`),
    },
    {
      name: t('courseQuestionBank'),
      url: `/courses/${courseId}/question-bank`,
      icon: <ClipboardList className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/question-bank`),
    },
    {
      name: t('courseGrades'),
      url: `/courses/${courseId}/grades`,
      icon: <Award className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/grades`),
    },
    {
      name: t('courseFiles'),
      url: `/courses/${courseId}/files`,
      icon: <Files className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/files`),
    },
    {
      name: t('courseMembers'),
      url: `/courses/${courseId}/members`,
      icon: <Users className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/members`),
    },
    {
      name: t('courseRoles'),
      url: `/courses/${courseId}/roles`,
      icon: <ShieldCheck className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/roles`),
    },
    {
      name: t('courseAnalytics'),
      url: `/courses/${courseId}/analytics`,
      icon: <LineChart className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/analytics`),
    },
    {
      name: t('courseSettings'),
      url: `/courses/${courseId}/settings`,
      icon: <Settings className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/settings`),
    },
  ];
}
