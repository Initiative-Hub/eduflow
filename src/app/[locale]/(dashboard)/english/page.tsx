import type { Metadata } from 'next';
import { EnglishAssistantClient } from './_components/english-assistant-client';

export const metadata: Metadata = {
  title: 'English Assistant',
};

export default async function EnglishAssistantPage() {
  return <EnglishAssistantClient />;
}
