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
  Link2,
  MessageSquare,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import {
  COURSE_PERMISSION,
  type PermissionKey,
  PLATFORM_PERMISSION,
} from '@/lib/permissions/permission-keys';

export type SidebarItem = {
  name: string;
  url: string;
  icon: ReactElement;
  isActive: (pathname: string) => boolean;
  requirePermissions?: PermissionKey[];
};

export const sidebarIconClassName =
  'size-5 text-primary/80 transition-colors group-data-[active=true]/menu-button:text-primary group-hover/menu-button:text-primary ';

function isExactMatch(pathname: string, path: string) {
  return pathname === path;
}

function isPrefixMatch(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function filterAdminNavItems(
  items: SidebarItem[],
  userPermissions: string[]
) {
  return items.filter(
    (item) =>
      !item.requirePermissions ||
      item.requirePermissions.every((permission) =>
        userPermissions.includes(permission)
      )
  );
}

export function filterCourseNavItems(
  items: SidebarItem[],
  coursePermissions: string[]
) {
  return items.filter(
    (item) =>
      !item.requirePermissions ||
      item.requirePermissions.every((permission) =>
        coursePermissions.includes(permission)
      )
  );
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
      isActive: (pathname) => isPrefixMatch(pathname, '/inventory'),
    },
    {
      name: t('socraticTutor'),
      url: '/socratic',
      icon: <GraduationCap className={sidebarIconClassName} />,
      isActive: (pathname) => isPrefixMatch(pathname, '/socratic'),
    },
    {
      name: t('englishAssistant'),
      url: '/english',
      icon: <Languages className={sidebarIconClassName} />,
      isActive: (pathname) => isPrefixMatch(pathname, '/english'),
    },
    {
      name: t('writingAssistant'),
      url: '/writing',
      icon: <PenLine className={sidebarIconClassName} />,
      isActive: (pathname) => isPrefixMatch(pathname, '/writing'),
    },
    {
      name: t('studyAssistant'),
      url: '/study',
      icon: <BookOpen className={sidebarIconClassName} />,
      isActive: (pathname) => isPrefixMatch(pathname, '/study'),
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
      name: t('settingsSharedLinks'),
      url: '/settings/shared-links',
      icon: <Link2 className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/settings/shared-links'),
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
      requirePermissions: [
        PLATFORM_PERMISSION.USERS_VIEW,
        PLATFORM_PERMISSION.USERS_MANAGE,
      ],
    },
    {
      name: t('adminRoles'),
      url: '/admin/roles',
      icon: <ShieldCheck className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, '/admin/roles'),
      requirePermissions: [
        PLATFORM_PERMISSION.ROLES_VIEW,
        PLATFORM_PERMISSION.ROLES_MANAGE,
      ],
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
      requirePermissions: [COURSE_PERMISSION.COURSE_CONTENT_VIEW],
    },
    {
      name: t('courseQuestionBank'),
      url: `/courses/${courseId}/question-bank`,
      icon: <ClipboardList className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/question-bank`),
      requirePermissions: [
        COURSE_PERMISSION.ASSESSMENTS_CREATE,
        COURSE_PERMISSION.ASSESSMENTS_UPDATE,
        COURSE_PERMISSION.ASSESSMENTS_DELETE,
      ],
    },
    {
      name: t('courseGrades'),
      url: `/courses/${courseId}/grades`,
      icon: <Award className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/grades`),
      requirePermissions: [COURSE_PERMISSION.ASSESSMENTS_RESULTS_VIEW],
    },
    {
      name: t('courseFiles'),
      url: `/courses/${courseId}/files`,
      icon: <Files className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/files`),
      requirePermissions: [COURSE_PERMISSION.COURSE_FILES_VIEW],
    },
    {
      name: t('courseMembers'),
      url: `/courses/${courseId}/members`,
      icon: <Users className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/members`),
      requirePermissions: [COURSE_PERMISSION.COURSE_MEMBERS_VIEW],
    },
    {
      name: t('courseRoles'),
      url: `/courses/${courseId}/roles`,
      icon: <ShieldCheck className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/roles`),
      requirePermissions: [COURSE_PERMISSION.COURSE_ROLES_MANAGE],
    },
    {
      name: t('courseAnalytics'),
      url: `/courses/${courseId}/analytics`,
      icon: <LineChart className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/analytics`),
      requirePermissions: [COURSE_PERMISSION.COURSE_ANALYTICS_VIEW],
    },
    {
      name: t('courseSettings'),
      url: `/courses/${courseId}/settings`,
      icon: <Settings className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/settings`),
      requirePermissions: [COURSE_PERMISSION.COURSE_SETTINGS_MANAGE],
    },
  ];
}
