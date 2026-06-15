import type { Metadata } from 'next';
import { WordbankClient } from './wordbank-client';

export const metadata: Metadata = {
  title: 'Wordbank',
};

export default async function WordbankPage() {
  return <WordbankClient />;
}
