'use client';

import { Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseRoleName } from '@/generated/prisma';
import {
  ACCORDION_DEFAULT_VALUES,
  getCoursePermissionCategoriesForRole,
  ROLE_TABS,
  type CoursePermissionDefinition,
  type CourseRolePermissionState,
} from './roles.config';
import { useRoles } from './use-roles';

type RolesClientProps = {
  courseId: string;
};

export function RolesClient({ courseId }: RolesClientProps) {
  const [activeRole, setActiveRole] = useState<CourseRoleName>('COURSE_OWNER');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftRoleState, setDraftRoleState] = useState<
    CourseRolePermissionState[]
  >([]);
  const { roles, isLoading, isError, isUpdating, savePermissions } =
    useRoles(courseId);

  useEffect(() => {
    if (roles.length === 0) return;
    setDraftRoleState(
      roles.map((role) => ({
        ...role,
        permissions: role.permissions.map((permission) => ({ ...permission })),
      }))
    );
  }, [roles]);

  const activeRoleState = roles.find((role) => role.role === activeRole);
  const activeDraftRoleState = draftRoleState.find(
    (role) => role.role === activeRole
  );

  const categories = useMemo(
    () =>
      getCoursePermissionCategoriesForRole(activeDraftRoleState, searchQuery),
    [activeDraftRoleState, searchQuery]
  );

  const permissionSummary = useMemo(() => {
    const permissions = activeDraftRoleState?.permissions ?? [];

    return {
      enabled: permissions.filter((permission) => permission.enabled).length,
      total: permissions.length,
    };
  }, [activeDraftRoleState]);

  const hasUnsavedChanges = useMemo(() => {
    const savedPermissions = new Map(
      activeRoleState?.permissions.map((permission) => [
        permission.permission,
        permission.enabled,
      ])
    );

    return (
      activeDraftRoleState?.permissions.some(
        (permission) =>
          permission.enabled !==
          (savedPermissions.get(permission.permission) ?? false)
      ) ?? false
    );
  }, [activeDraftRoleState, activeRoleState]);

  const handlePermissionChange = (
    permission: CoursePermissionDefinition,
    enabled: boolean
  ) => {
    setDraftRoleState((currentStates) =>
      currentStates.map((roleState) => {
        if (roleState.role !== activeRole) {
          return roleState;
        }

        return {
          ...roleState,
          permissions: roleState.permissions.map((permissionState) =>
            permissionState.permission === permission.key
              ? { ...permissionState, enabled }
              : permissionState
          ),
        };
      })
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!activeDraftRoleState) return;

    await savePermissions({
      role: activeRole,
      permissions: activeDraftRoleState.permissions.map((permission) => ({
        permission: permission.permission,
        enabled: permission.enabled,
      })),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-2xl">Course Role Management</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
              Configure course-level access for course owners, teachers, and
              students.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="text-muted-foreground text-xs">Enabled</div>
            <div className="font-semibold text-xl">
              {permissionSummary.enabled}
            </div>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="text-muted-foreground text-xs">Available</div>
            <div className="font-semibold text-xl">
              {permissionSummary.total}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeRole}
        onValueChange={(value) => setActiveRole(value as CourseRoleName)}
        className="gap-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full justify-start sm:w-fit">
            {ROLE_TABS.map((role) => {
              const RoleIcon = role.icon;
              return (
                <TabsTrigger key={role.value} value={role.value}>
                  <RoleIcon />
                  {role.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search permissions by name or description..."
              className="pl-9"
            />
          </div>
        </div>

        {ROLE_TABS.map((role) => (
          <TabsContent key={role.value} value={role.value}>
            {isLoading ? (
              <div className="rounded-lg border bg-card p-6 text-muted-foreground text-sm">
                Loading permissions...
              </div>
            ) : isError ? (
              <div className="rounded-lg border bg-card p-6 text-destructive text-sm">
                Failed to load role permissions.
              </div>
            ) : categories.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No permissions found</EmptyTitle>
                  <EmptyDescription>
                    Try searching by another permission name or description.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Accordion
                  type="multiple"
                  defaultValue={ACCORDION_DEFAULT_VALUES}
                  className="flex flex-col gap-4"
                >
                  {categories.map((category) => {
                    const CategoryIcon = category.icon;

                    return (
                      <AccordionItem
                        key={category.value}
                        value={category.value}
                        className="rounded-lg border bg-card px-4 py-4"
                      >
                        <AccordionTrigger className="gap-4 py-0">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <CategoryIcon className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="font-semibold text-base">
                                {category.title}
                              </h2>
                              <p className="text-muted-foreground text-sm">
                                {category.description}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="mr-3">
                            {category.enabledCount}/{category.totalCount}
                          </Badge>
                        </AccordionTrigger>

                        <AccordionContent className="pt-6 pb-0">
                          <div className="flex flex-col gap-3">
                            {category.permissions.map((permission) => (
                              <PermissionRow
                                key={permission.key}
                                permission={permission}
                                isUpdating={isUpdating}
                                onCheckedChange={(enabled) =>
                                  handlePermissionChange(permission, enabled)
                                }
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                <div className="flex justify-end border-t pt-4">
                  <Button
                    type="button"
                    disabled={!hasUnsavedChanges || isUpdating}
                    onClick={handleSaveRolePermissions}
                  >
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

type PermissionRowProps = {
  permission: CoursePermissionDefinition;
  isUpdating: boolean;
  onCheckedChange: (enabled: boolean) => void;
};

function PermissionRow({
  permission,
  isUpdating,
  onCheckedChange,
}: PermissionRowProps) {
  const PermissionIcon = permission.icon;

  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-lg border bg-background px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <PermissionIcon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{permission.title}</h3>
          <p className="text-muted-foreground text-sm">
            {permission.description}
          </p>
        </div>
      </div>

      <Switch
        checked={permission.enabled}
        disabled={isUpdating}
        aria-label={`Toggle ${permission.title}`}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
