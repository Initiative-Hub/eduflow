import type { Metadata } from 'next';
import AdminUsersClient from './client';

export const metadata: Metadata = {
  title: 'User Management',
};

export default async function AdminUsersPage() {
  return <AdminUsersClient />;
}
