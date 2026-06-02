import type { Metadata } from 'next';
import { RolesClient } from './client';

export const metadata: Metadata = {
  title: 'Roles',
};

export default async function AdminRolesPage() {
  return <RolesClient />;
}
