import type { Metadata } from 'next';
import { StudyClient } from './_components/study-client';

export const metadata: Metadata = {
  title: 'Study Assistant',
};

export default function StudyAssistantPage() {
  return <StudyClient />;
}
