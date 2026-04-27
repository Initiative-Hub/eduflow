'use client';

import {
  BookOpen,
  Cloud,
  GraduationCap,
  Languages,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  School,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useEffect } from 'react';
import { useCourses } from '@/app/[locale]/(dashboard)/courses/use-courses';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSession } from '@/lib/auth-client';
import { NavbarAvatar } from './navbar-avatar';
import {
  getCourseNavItems,
  type SidebarItem,
  sidebarIconClassName,
} from './sidebar-config';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('Layout');
  const tNavbarAvatar = useTranslations('NavbarAvatar');
  const pathname = usePathname();

  const { data: sessionData, refetch } = useSession();
  const { state, toggleSidebar } = useSidebar();

  const assistants: SidebarItem[] = [
    {
      name: t('aiChat'),
      url: '/',
      icon: <MessageSquare className={sidebarIconClassName} />,
      exact: true,
    },
    {
      name: t('socraticTutor'),
      url: '/socratic',
      icon: <GraduationCap className={sidebarIconClassName} />,
    },
    {
      name: t('englishAssistant'),
      url: '/english',
      icon: <Languages className={sidebarIconClassName} />,
    },
    {
      name: t('writingAssistant'),
      url: '/writing',
      icon: <PenLine className={sidebarIconClassName} />,
    },
    {
      name: t('studyAssistant'),
      url: '/study',
      icon: <BookOpen className={sidebarIconClassName} />,
    },
  ];

  const settingsItems: SidebarItem[] = [
    {
      name: t('settingsProfile'),
      url: '/profile',
      icon: <User className={sidebarIconClassName} />,
      exact: true,
    },
    {
      name: t('settingsAcademicContext'),
      url: '/settings/academic-context',
      icon: <School className={sidebarIconClassName} />,
      exact: true,
    },
    {
      name: t('settingsSystemSettings'),
      url: '/settings',
      icon: <Settings className={sidebarIconClassName} />,
      exact: true,
    },
    {
      name: t('settingsAiPreferences'),
      url: '/settings/ai-preferences',
      icon: <Sparkles className={sidebarIconClassName} />,
      exact: true,
    },
    {
      name: t('settingsIntegrations'),
      url: '/settings/integrations',
      icon: <Cloud className={sidebarIconClassName} />,
      exact: true,
    },
  ];

  const match = pathname.match(/\/courses\/([^/]+)/);
  const courseId = match ? match[1] : null;

  const { courses } = useCourses(undefined, { enabled: !!sessionData });
  const currentCourse = courseId
    ? courses.find((c) => c.id === courseId)
    : null;

  const courseItems = courseId
    ? getCourseNavItems(courseId, sidebarIconClassName)
    : [];

  const isSettingsContext =
    pathname === '/profile' || pathname.startsWith('/settings');

  let menuItems = assistants;
  if (isSettingsContext) {
    menuItems = settingsItems;
  } else if (courseId) {
    menuItems = courseItems;
  }

  useEffect(() => {
    // Refetch session data on mount to ensure we have the latest auth state
    refetch();
  }, [refetch]);

  return (
    <Sidebar
      collapsible="icon"
      className="z-40 border-r-0 bg-card shadow-2xl"
      {...props}
    >
      <SidebarHeader className="flex flex-col gap-6 p-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:p-2">
        <Link
          href="/"
          className="mt-2 mb-1 flex items-center gap-3 rounded-lg px-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-primary text-xl leading-none tracking-tight">
              EduFlow
            </span>
            <span className="mt-1 font-bold text-muted-foreground/80 text-xs tracking-widest">
              ACADEMIC CURATOR
            </span>
          </div>
        </Link>

        {!pathname.includes('/courses/') ? (
          <Button
            className="group-data-[collapsible=icon]:justify-center! relative w-full justify-start rounded-xl bg-linear-to-br from-primary to-primary/80 px-4 py-6 font-semibold text-primary-foreground shadow-md transition-all hover:from-primary/90 hover:to-primary/70 hover:shadow-lg group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:p-0!"
            size="lg"
          >
            <Plus
              data-icon="inline-start"
              className="size-5 shrink-0 opacity-80 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1/2 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:-translate-y-1/2"
            />
            <span className="text-sm group-data-[collapsible=icon]:hidden">
              {t('newSession')}
            </span>
          </Button>
        ) : currentCourse ? (
          <div className="flex w-full flex-col gap-1 px-2 group-data-[collapsible=icon]:hidden">
            <span className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-widest">
              Course
            </span>
            <h2 className="line-clamp-2 font-bold text-[1rem] text-foreground leading-tight">
              {currentCourse.title}
            </h2>
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {isSettingsContext ? (
              <div className="px-5 pt-2 pb-1 group-data-[collapsible=icon]:hidden">
                <h2 className="font-bold text-foreground text-lg leading-tight">
                  {t('settingsHeading')}
                </h2>
                <p className="mt-1 text-muted-foreground text-sm leading-tight">
                  {t('settingsSubheading')}
                </p>
              </div>
            ) : null}
            <SidebarMenu className="mt-2 gap-3 px-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
              {menuItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.url
                  : pathname === item.url ||
                    pathname.startsWith(`${item.url}/`);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={{ children: item.name }}
                      className="h-12 rounded-xl font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-3.5 px-2"
                      >
                        {item.icon}
                        <span className="text-sm tracking-tight">
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-border/40 border-t p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3">
        <div className="flex w-full items-center justify-between md:justify-end md:group-data-[collapsible=icon]:justify-center">
          {sessionData ? (
            <div className="block md:hidden">
              <NavbarAvatar
                name={sessionData.user.name}
                email={sessionData.user.email}
                image={sessionData.user.image}
                role={sessionData.user.role ?? undefined}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 font-heading md:hidden">
              <Button asChild>
                <Link href="/login">{tNavbarAvatar('actions.login')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">
                  {tNavbarAvatar('actions.register')}
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            {state === 'expanded' ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeftOpen className="size-5" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
