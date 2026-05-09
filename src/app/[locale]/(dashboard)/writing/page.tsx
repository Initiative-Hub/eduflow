import { PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import WritingClient from './_components/writing-client';

export const metadata: Metadata = {
  title: 'Writing Assistant',
};

export default async function WritingAssistantPage() {
  // const session = await auth.api.getSession({ headers: await headers() });

  return <WritingClient />;
}
