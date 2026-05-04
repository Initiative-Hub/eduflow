import type { ReactNode } from 'react';
import { AppNavbar } from '@/components/layout/app-navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import UserLoader from '@/components/user-loader';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <UserLoader />
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        <AppNavbar />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {/* Ambient Purple Glow Effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-[-20%] right-[-10%] size-125 rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute top-[40%] left-[-10%] size-100 rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute right-[20%] bottom-[-20%] size-112.5 rounded-full bg-primary/10 blur-[120px]" />
          </div>
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-6 md:p-10 lg:p-12">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
