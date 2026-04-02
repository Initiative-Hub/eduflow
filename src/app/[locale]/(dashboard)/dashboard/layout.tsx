import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppSidebar } from '@/components/custom/app-sidebar';
import { AppNavbar } from '@/components/custom/app-navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppNavbar />
        <main className="relative flex flex-1 flex-col overflow-y-auto bg-background">
          {/* Ambient Purple Glow Effects */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-[20%] -right-[10%] size-[500px] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute top-[40%] -left-[10%] size-[400px] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute -bottom-[20%] right-[20%] size-[450px] rounded-full bg-primary/10 blur-[120px]" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-7xl p-6 md:p-10 lg:p-12">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
