'use client';

import {
  Archive,
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
import {
  PLATFORM_PERMISSION,
  type PlatformPermissionKey,
} from '@/lib/permissions/permission-keys';

export type SidebarItem = {
  name: string;
  url: string;
  icon: ReactElement;
  isActive: (pathname: string) => boolean;
};

const adminPermissionsByUrl: Record<string, PlatformPermissionKey[]> = {
  '/admin/users': [
    PLATFORM_PERMISSION.USERS_VIEW,
    PLATFORM_PERMISSION.USERS_MANAGE,
  ],
  '/admin/roles': [
    PLATFORM_PERMISSION.ROLES_VIEW,
    PLATFORM_PERMISSION.ROLES_MANAGE,
  ],
};

export const sidebarIconClassName =
  'size-5 text-primary/80 transition-colors group-data-[active=true]/menu-button:text-primary group-hover/menu-button:text-primary ';

function isExactMatch(pathname: string, url: string) {
  return pathname === url;
}

function hasAnyPermission(
  userPermissions: readonly string[],
  requiredPermissions: readonly PlatformPermissionKey[]
) {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

export function filterAdminNavItems(
  items: SidebarItem[],
  userPermissions: readonly string[]
) {
  return items.filter((item) => {
    const requiredPermissions = adminPermissionsByUrl[item.url];

    return (
      requiredPermissions &&
      hasAnyPermission(userPermissions, requiredPermissions)
    );
  });
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

export function getCourseNavItems(courseId: string): SidebarItem[] {
  return [
    {
      name: 'Modules',
      url: `/courses/${courseId}`,
      icon: <BookOpen className={sidebarIconClassName} />,
      isActive: (pathname) => isExactMatch(pathname, `/courses/${courseId}`),
    },
    {
      name: 'Question Bank',
      url: `/courses/${courseId}/question-bank`,
      icon: <ClipboardList className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/question-bank`),
    },
    {
      name: 'Files',
      url: `/courses/${courseId}/files`,
      icon: <Files className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/files`),
    },
    {
      name: 'Members',
      url: `/courses/${courseId}/members`,
      icon: <Users className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/members`),
    },
    {
      name: 'Roles',
      url: `/courses/${courseId}/roles`,
      icon: <ShieldCheck className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/roles`),
    },
    {
      name: 'Analytics',
      url: `/courses/${courseId}/analytics`,
      icon: <LineChart className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/analytics`),
    },
    {
      name: 'Settings',
      url: `/courses/${courseId}/settings`,
      icon: <Settings className={sidebarIconClassName} />,
      isActive: (pathname) =>
        isExactMatch(pathname, `/courses/${courseId}/settings`),
    },
  ];
}
