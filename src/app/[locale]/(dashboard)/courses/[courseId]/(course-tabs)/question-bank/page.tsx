import { QuestionBankClient } from './question-bank-client';

interface QuestionBankPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function QuestionBankPage({
  params,
}: QuestionBankPageProps) {
  const { courseId } = await params;

  return <QuestionBankClient courseId={courseId} />;
}
