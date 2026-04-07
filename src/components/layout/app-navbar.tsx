'use client';

import { Bell, GraduationCap, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NavbarAvatar } from '@/components/layout/navbar-avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { useSession } from '@/lib/auth-client';

export function AppNavbar() {
  const t = useTranslations('Layout');
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { data: sessionData } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between overflow-hidden border-border/40 border-b bg-background/95 px-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60 md:px-8">
      <div className="flex h-full min-w-0 flex-1 items-center gap-2 md:gap-8">
        {/* Mobile Logo (Hidden on Desktop) */}
        <div className="mr-2 flex shrink-0 items-center gap-2 md:hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" strokeWidth={2.5} />
          </div>
        </div>

        <nav className="no-scrollbar -mb-1 flex flex-1 items-center gap-4 overflow-x-auto pb-1 md:gap-8">
          <Link
            href="/dashboard"
            className="relative flex flex-col items-center justify-center whitespace-nowrap"
          >
            <span
              className={`pb-1.5 text-sm transition-colors ${pathname === '/dashboard' || pathname.startsWith('/socratic') || pathname.startsWith('/english') || pathname.startsWith('/writing') || pathname.startsWith('/study') ? 'font-bold text-primary' : 'font-medium text-muted-foreground hover:text-foreground'}`}
            >
              {t('aiTools')}
            </span>
            {(pathname === '/' ||
              pathname.startsWith('/socratic') ||
              pathname.startsWith('/english') ||
              pathname.startsWith('/writing') ||
              pathname.startsWith('/study')) && (
              <div className="absolute bottom-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </Link>
          <Link
            href="/course"
            className="relative flex flex-col items-center justify-center"
          >
            <span
              className={`pb-1.5 text-sm transition-colors ${pathname.startsWith('/course') ? 'font-bold text-primary' : 'font-medium text-muted-foreground hover:text-foreground'}`}
            >
              {t('studyHub')}
            </span>
            {pathname.startsWith('/course') && (
              <div className="absolute bottom-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-1 ring-background" />
        </Button>

        <Separator orientation="vertical" className="hidden md:block" />

        {/* Account Actions / Profile (Desktop Only) */}
        <NavbarAvatar
          name={sessionData?.user?.name}
          email={sessionData?.user?.email}
          image={sessionData?.user?.image}
          role={(sessionData?.user as any)?.role}
        />

        {/* Custom Hamburger Trigger for Mobile */}
        <div className="ml-1 flex items-center md:hidden">
          <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon"
            onClick={() => toggleSidebar()}
            className="shrink-0 rounded-full text-muted-foreground"
          >
            <Menu className="size-6 text-foreground" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
