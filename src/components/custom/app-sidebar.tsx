'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  GraduationCap,
  Languages,
  PenLine,
  BookOpen,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('Layout');
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();

  const assistants = [
    {
      name: t('aiChat'),
      url: '/dashboard',
      icon: MessageSquare,
    },
    {
      name: t('socraticTutor'),
      url: '/dashboard/socratic',
      icon: GraduationCap,
    },
    {
      name: t('englishAssistant'),
      url: '/dashboard/english',
      icon: Languages,
    },
    {
      name: t('writingAssistant'),
      url: '/dashboard/writing',
      icon: PenLine,
    },
    {
      name: t('studyAssistant'),
      url: '/dashboard/study',
      icon: BookOpen,
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 shadow-2xl z-40 bg-card"
      {...props}
    >
      <SidebarHeader className="p-5 flex flex-col gap-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3 px-1 mt-2 mb-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-xl tracking-tight leading-none text-primary">
              EduFlow
            </span>
            <span className="text-xs font-bold tracking-widest text-muted-foreground/80 mt-1">
              ACADEMIC CURATOR
            </span>
          </div>
        </div>
        <Button
          className="w-full justify-start rounded-xl font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-md transition-all hover:shadow-lg py-6 px-4 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:mx-auto relative"
          size="lg"
        >
          <Plus
            data-icon="inline-start"
            className="opacity-80 size-5 shrink-0 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1/2 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:-translate-y-1/2 group-data-[collapsible=icon]:m-0"
          />
          <span className="text-sm group-data-[collapsible=icon]:hidden">
            {t('newSession')}
          </span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3 px-4 mt-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
              {assistants.map((item) => {
                const isActive =
                  item.url === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={{
                        children: item.name,
                      }}
                      className={`
                        h-[48px] rounded-xl font-medium transition-all duration-200
                        /* Active State: Semantic background and primary text */
                        data-[active=true]:bg-primary/10 data-[active=true]:text-primary 
                        /* Inactive State: Semantic grey text */
                        text-muted-foreground hover:bg-sidebar-accent hover:text-primary
                      `}
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
      <SidebarFooter className="p-4 border-t border-border/40 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3">
        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex justify-end group-data-[collapsible=icon]:justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-foreground rounded-full"
          >
            {state === 'expanded' ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeftOpen className="size-5" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        {/* Mobile Avatar Layout */}
        <div className="md:hidden flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
          <Avatar className="size-10 cursor-pointer border hover:ring-2 hover:ring-primary/20 transition-all">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              U
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">User</span>
            <span className="text-xs text-muted-foreground">Free Plan</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
