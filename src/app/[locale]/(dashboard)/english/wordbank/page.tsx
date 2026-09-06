import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WordbankClient } from './wordbank-client';

export const metadata: Metadata = {
  title: 'Wordbank',
};

export default async function WordbankPage() {
  return (
    <Suspense>
      <WordbankClient />
    </Suspense>
  );
}
