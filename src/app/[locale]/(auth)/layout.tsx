import type { ReactNode } from 'react';
import { AuthPageSwitcher } from '@/components/auth/auth-page-switcher';
import { AuthSocialOptions } from '@/components/auth/auth-social-options';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 -left-28 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <main className="w-full rounded-4xl bg-card px-6 py-8 shadow-2xl md:px-8 md:py-10">
          <div className="text-center">
            <h1 className="font-black text-4xl text-primary leading-none">
              EduFlow
            </h1>
            <p className="mt-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">
              Academic Atelier
            </p>
          </div>

          <div className="mt-8">{children}</div>
          <AuthSocialOptions />
        </main>

        <AuthPageSwitcher />
      </div>
    </div>
  );
}
