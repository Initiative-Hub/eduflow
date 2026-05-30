import type { Metadata } from 'next';
import UsersManager from '@/components/client/UsersManager';

export const metadata: Metadata = {
  title: 'User Management',
};

export default async function AdminUsersPage() {
  return <UsersManager />;
}
