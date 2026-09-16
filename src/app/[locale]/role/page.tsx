import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoleClient } from './client';

export const metadata: Metadata = {
  title: 'Select Role',
};

export default async function RoleSelectionPage() {
  return (
    <Suspense>
      <RoleClient />
    </Suspense>
  );
}
