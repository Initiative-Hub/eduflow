import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface LessonEditorProps {
  editTitle: string;
  setEditTitle: (val: string) => void;
  editContent: string;
  setEditContent: (val: string) => void;
  isUpdatingLesson: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function LessonEditor({
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  isUpdatingLesson,
  onCancel,
  onSave,
}: LessonEditorProps) {
  const t = useTranslations('Courses.LessonEditor');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="font-medium text-sm">{t('title')}</label>
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="font-semibold text-lg"
        />
      </div>
      <div className="flex flex-1 flex-col space-y-2">
        <label className="font-medium text-sm">{t('content')}</label>
        <Textarea
          className="min-h-100 flex-1 resize-none p-4 font-mono text-sm leading-relaxed"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder={t('writeReview')}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={onSave} disabled={isUpdatingLesson}>
          <Save className="mr-2 h-4 w-4" />
          {isUpdatingLesson ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
