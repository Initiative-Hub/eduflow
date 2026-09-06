'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';

interface QuestionBankSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function QuestionBankSearch({
  value,
  onChange,
}: QuestionBankSearchProps) {
  const t = useTranslations('Courses.QuestionBank');

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="pl-9"
      />
    </div>
  );
}
