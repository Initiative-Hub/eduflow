'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  MessageSquare,
  FileText,
  Files,
  Users,
  LineChart,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface CourseMenuSidebarProps {
  courseId: string;
}

export function CourseMenuSidebar({ courseId }: CourseMenuSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs = [
    {
      name: 'Modules (Home)',
      href: `/courses/${courseId}`,
      icon: <BookOpen className="w-4 h-4" />,
      exactMatch: true,
    },
    {
      name: 'Course AI Chat',
      href: `/courses/${courseId}/chat`,
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      name: 'Assessments',
      href: `/courses/${courseId}/assessments`,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: 'Files',
      href: `/courses/${courseId}/files`,
      icon: <Files className="w-4 h-4" />,
    },
    {
      name: 'Members',
      href: `/courses/${courseId}/members`,
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: 'Analytics',
      href: `/courses/${courseId}/analytics`,
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      name: 'Settings',
      href: `/courses/${courseId}/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className={cn(
        'border-r bg-card/30 flex flex-col h-full hidden md:flex transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase truncate pr-2">
            Course Navigation
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0', isCollapsed && 'mx-auto')}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div
        className={cn(
          'flex-1 overflow-y-auto py-4 space-y-1',
          isCollapsed ? 'px-2' : 'px-3'
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.exactMatch
            ? pathname.endsWith(`/courses/${courseId}`) ||
              pathname.endsWith(`/courses/${courseId}/`)
            : pathname.includes(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              title={isCollapsed ? tab.name : undefined}
              className={cn(
                'flex items-center py-2 text-sm rounded-md transition-colors',
                isCollapsed ? 'justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className={cn('flex items-center', !isCollapsed && 'w-6')}>
                {tab.icon}
              </div>
              {!isCollapsed && <span>{tab.name}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
