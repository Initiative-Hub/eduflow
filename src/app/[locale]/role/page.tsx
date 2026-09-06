import type { Metadata } from 'next';
import { RoleClient } from './client';

export const metadata: Metadata = {
  title: 'Select Role',
};

export default async function RoleSelectionPage() {
  return <RoleClient />;
}
