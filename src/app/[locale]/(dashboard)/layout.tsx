import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AppNavbar } from '@/components/layout/app-navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { PlatformPermissionProvider } from '@/components/permissions/platform-permission-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/lib/auth';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import {
  createPlatformPermissionState,
  EMPTY_PLATFORM_PERMISSION_STATE,
} from '@/lib/permissions/platform-permission-state';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { permissions } = session?.user?.id
    ? await getPlatformPermissions(session.user.id)
    : { permissions: [] };

  const platformPermissionState = session?.user?.id
    ? createPlatformPermissionState(permissions)
    : EMPTY_PLATFORM_PERMISSION_STATE;

  return (
    <PlatformPermissionProvider state={platformPermissionState}>
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
              <div className="mx-auto min-h-full max-w-7xl px-6 py-6 md:px-10">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PlatformPermissionProvider>
  );
}
