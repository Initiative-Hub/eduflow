'use client';

import {
  BookOpen,
  GraduationCap,
  Languages,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { authClient, useSession } from '@/lib/auth-client';
import { useLoadingStore } from '@/stores/useLoadingStore';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('Layout');
  const tCommon = useTranslations('Common');
  const pathname = usePathname();
  const router = useRouter();
  const setLoading = useLoadingStore((state) => state.setLoading);

  const { data: sessionData } = useSession();
  const { state, toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login');
        },
      },
    });
  };

  const assistants = [
    {
      name: t('aiChat'),
      url: '/',
      icon: MessageSquare,
    },
    {
      name: t('socraticTutor'),
      url: '/socratic',
      icon: GraduationCap,
    },
    {
      name: t('englishAssistant'),
      url: '/english',
      icon: Languages,
    },
    {
      name: t('writingAssistant'),
      url: '/writing',
      icon: PenLine,
    },
    {
      name: t('studyAssistant'),
      url: '/study',
      icon: BookOpen,
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="z-40 border-r-0 bg-card shadow-2xl"
      {...props}
    >
      <SidebarHeader className="flex flex-col gap-6 p-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:p-2">
        <div className="mt-2 mb-1 flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
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
        </div>
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 gap-3 px-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
              {assistants.map((item) => {
                const isActive =
                  item.url === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={{
                        children: item.name,
                      }}
                      className={`/* Active State: Semantic background and primary text */ /* Inactive State: Semantic grey text */ h-12 rounded-xl font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary`}
                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-3.5 px-2"
                      >
                        <item.icon
                          className={`size-6 transition-colors ${
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground/70 group-hover/menu-button:text-primary'
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
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
        {/* Desktop Collapse Toggle */}
        <div className="hidden w-full items-center justify-between group-data-[collapsible=icon]:justify-center md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:hidden"
            title={tCommon('logout')}
          >
            <LogOut className="size-5" />
            <span className="sr-only">Logout</span>
          </Button>
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

        <div className="flex w-full items-center justify-between rounded-xl p-2 transition-colors hover:bg-muted/40 md:hidden">
          <div className="flex min-w-0 cursor-pointer items-center gap-3">
            <Avatar className="size-10 shrink-0 cursor-pointer border transition-all hover:ring-2 hover:ring-primary/20">
              <AvatarImage
                src={sessionData?.user?.image || ''}
                alt={sessionData?.user?.name || 'User'}
              />
              <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
                {sessionData?.user?.name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground text-sm">
                {sessionData?.user?.name || 'User'}
              </span>
              <span className="max-w-30 truncate text-muted-foreground text-xs">
                {sessionData?.user?.email || 'Free Plan'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="ml-1 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title={tCommon('logout')}
          >
            <LogOut className="size-5" />
            <span className="sr-only">{tCommon('logout')}</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
