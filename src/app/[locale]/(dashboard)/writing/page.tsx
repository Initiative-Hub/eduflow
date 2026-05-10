import type { Metadata } from 'next';
import WritingClient from './_components/writing-client';

export const metadata: Metadata = {
  title: 'Writing Assistant',
};

export default async function WritingAssistantPage() {
  return <WritingClient />;
}
