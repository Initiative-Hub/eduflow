import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-4">
        <nav className="flex items-center gap-4 font-medium text-sm">
          <Link href="/" className="transition-colors hover:text-foreground/80">
            Home
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-foreground/80"
          >
            About
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground/80"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="transition-colors hover:text-foreground/80"
          >
            Register
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
