'use client';

import { ArrowRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';

interface MarketingMobileNavigationProps {
  items: Array<{ href: string; label: string }>;
  labels: {
    description: string;
    login: string;
    menu: string;
    startFree: string;
    title: string;
  };
}

export function MarketingMobileNavigation({
  items,
  labels,
}: MarketingMobileNavigationProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label={labels.menu}
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>
        <nav aria-label={labels.title} className="px-4">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <SheetClose asChild>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>
        <SheetFooter>
          <SheetClose asChild>
            <Button asChild variant="outline">
              <Link href="/login">{labels.login}</Link>
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button asChild>
              <Link href="/register">
                {labels.startFree}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
