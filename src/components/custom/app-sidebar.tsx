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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('Layout');
  const pathname = usePathname();

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
      className="border-r-0 shadow-[4px_0_24px_rgba(0,0,0,0.06)] z-40 bg-card"
      {...props}
    >
      <SidebarHeader className="p-5 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-1 mt-2 mb-1">
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-6" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[22px] tracking-tight leading-none text-primary">
              EduFlow
            </span>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground/80 mt-1">
              ACADEMIC CURATOR
            </span>
          </div>
        </div>
        <Button
          className="w-full justify-start rounded-[14px] font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-md transition-all hover:shadow-lg py-6 px-4"
          size="lg"
        >
          <Plus data-icon="inline-start" className="opacity-80 size-5" />
          <span className="text-[15px]">{t('newSession')}</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3 px-4 mt-2">
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
                      tooltip={item.name}
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
                        className="flex items-center gap-3.5 px-3"
                      >
                        <item.icon
                          className={`size-[20px] transition-colors ${
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground/70'
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="text-[15px] tracking-tight">
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
      <SidebarFooter className="md:hidden p-4 border-t border-border/40">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
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
