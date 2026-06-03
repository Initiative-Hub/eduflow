export const ADMIN_USERS_QUERY_KEY = ['admin', 'users'] as const;

export const ROLE_OPTIONS = ['ADMIN', 'TEACHER', 'STUDENT'] as const;

export const PAGE_SIZE_OPTIONS = ['4', '10', '20', '50'] as const;

export type AdminUserRole = (typeof ROLE_OPTIONS)[number];

export type AdminUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  role?: string;
  createdAt: string;
};

export type AdminUserCreateInput = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export type AdminUserUpdateInput = {
  id: string;
  name?: string | null;
  email?: string;
  role?: string | null;
};

export type AdminUserMutationResponse = {
  message: string;
  id: string;
};

export type AdminUserEditForm = {
  name: string;
  email: string;
  role: string;
};

export function filterAdminUsers(
  users: AdminUser[],
  query: string,
  roleFilter: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  return users.filter((user) => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      (user.name ?? '').toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.id.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getAdminUserInitials(
  name?: string | null,
  email?: string | null
) {
  const displayName = name || email || '';

  return (
    displayName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}
