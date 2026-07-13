import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChatView } from '@/app/[locale]/(dashboard)/_components/chat-view';
import { auth } from '@/lib/auth';
import { StudyShareService } from '@/services/StudyShareService';

interface SharedStudyChatPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: SharedStudyChatPageProps): Promise<Metadata> {}
