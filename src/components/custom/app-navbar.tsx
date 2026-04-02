'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppNavbar() {
  const t = useTranslations('Layout');
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm md:px-8 overflow-hidden">
      <div className="flex h-full items-center gap-2 md:gap-8 min-w-0 flex-1">
        {/* Mobile Logo (Hidden on Desktop) */}
        <div className="flex items-center gap-2 md:hidden mr-2 shrink-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" strokeWidth={2.5} />
          </div>
        </div>

        <nav className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-1 -mb-1 flex-1">
          <Link
            href="/dashboard"
            className="relative flex flex-col items-center justify-center whitespace-nowrap"
          >
            <span
              className={`text-[15px] transition-colors pb-1.5 ${pathname === '/dashboard' || pathname.startsWith('/dashboard/socratic') || pathname.startsWith('/dashboard/english') || pathname.startsWith('/dashboard/writing') || pathname.startsWith('/dashboard/study') ? 'font-bold text-primary' : 'font-medium text-muted-foreground hover:text-foreground'}`}
            >
              {t('aiTools')}
            </span>
            {(pathname === '/dashboard' ||
              pathname.startsWith('/dashboard/socratic') ||
              pathname.startsWith('/dashboard/english') ||
              pathname.startsWith('/dashboard/writing') ||
              pathname.startsWith('/dashboard/study')) && (
              <div className="absolute bottom-0 h-[3px] w-full rounded-full bg-primary" />
            )}
          </Link>
          <Link
            href="/dashboard/course"
            className="relative flex flex-col items-center justify-center"
          >
            <span
              className={`text-[15px] transition-colors pb-1.5 ${pathname.startsWith('/dashboard/course') ? 'font-bold text-primary' : 'font-medium text-muted-foreground hover:text-foreground'}`}
            >
              {t('studyHub')}
            </span>
            {pathname.startsWith('/dashboard/course') && (
              <div className="absolute bottom-0 h-[3px] w-full rounded-full bg-primary" />
            )}
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {/* Account Actions / Profile (Desktop Only) */}
        <div className="hidden md:flex items-center gap-3 mr-2 p-1 rounded-full hover:bg-muted/40 transition-colors cursor-pointer">
          <Avatar className="size-8 cursor-pointer border hover:ring-2 hover:ring-primary/20 transition-all">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              U
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-foreground pr-2">
            User
          </span>
        </div>

        {/* Custom Hamburger Trigger for Mobile */}
        <div className="md:hidden ml-1 flex items-center">
          <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon"
            onClick={() => toggleSidebar()}
            className="text-muted-foreground shrink-0 rounded-full"
          >
            <Menu className="size-6 text-foreground" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
