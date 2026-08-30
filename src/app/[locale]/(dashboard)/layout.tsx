import type { ReactNode } from 'react';
import { AppNavbar } from '@/components/layout/app-navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen">
        <AppNavbar />
        <div className="relative h-full overflow-hidden">
          {/* Ambient Purple Glow Effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-[-20%] right-[-10%] size-125 rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute top-[40%] left-[-10%] size-100 rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute right-[20%] bottom-[-20%] size-112.5 rounded-full bg-primary/10 blur-[120px]" />
          </div>
          <div className="relative z-10 h-full overflow-y-auto">
            <div className="mx-auto min-h-full max-w-7xl px-6 py-6 has-[.dashboard-full-bleed]:max-w-none has-[.dashboard-full-bleed]:p-0 md:px-10 md:has-[.dashboard-full-bleed]:px-0">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
