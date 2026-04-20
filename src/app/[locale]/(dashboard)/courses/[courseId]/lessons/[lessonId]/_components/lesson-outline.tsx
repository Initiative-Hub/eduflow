'use client';

import { BookOpen, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import type { FormFieldConfig } from '@/components/custom/form';
import { FormTemplate } from '@/components/custom/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useModules } from '../../../use-modules';
import { ModuleLessonList } from './module-lesson-list';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Module Title is required'),
});

const createModuleFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Module Title',
    type: 'text',
    placeholder: 'E.g., Getting Started',
    required: true,
    colSpan: 2,
  },
];

interface LessonOutlineProps {
  courseId: string;
  activeLessonId?: string;
  onSelectLesson?: (id: string) => void;
  className?: string;
}

export function LessonOutline({
  courseId,
  activeLessonId,
  onSelectLesson,
  className,
}: LessonOutlineProps) {
  const router = useRouter();
  const { modules, isLoading, isCreatingModule, handleCreateModule } =
    useModules(courseId);
  const dialog = useDialog();
  const t = useTranslations('Courses.LessonOutline');
  const tDialog = useTranslations('Courses.LessonOutline.Dialog');

  const translatedFields = createModuleFields.map((field) => ({
    ...field,
    label: tDialog(`fields.${field.name}`),
    placeholder: tDialog(`fields.${field.name}Placeholder`),
  }));

  const onCreateSubmit = (data: { title: string }) => {
    handleCreateModule(data, { onSuccess: () => dialog.close() });
  };

  const handleSelectLesson = (lessonId: string) => {
    if (onSelectLesson) {
      onSelectLesson(lessonId);
    } else {
      router.push(`/courses/${courseId}/lessons/${lessonId}`);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full w-80 flex-col border-l bg-card/30 transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold text-lg">{t('title')}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dialog.open()}
            title={t('addModule')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="flex flex-col items-center p-6 text-center text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">{t('noModules')}</p>
            <Button variant="link" onClick={() => dialog.open()}>
              {t('addFirstModule')}
            </Button>
          </div>
        ) : (
          <ModuleLessonList
            modules={modules}
            activeLessonId={activeLessonId}
            onSelectLesson={handleSelectLesson}
          />
        )}
      </div>

      <DialogTemplate
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        title={tDialog('title')}
        description={tDialog('description')}
      >
        <FormTemplate
          schema={createModuleSchema}
          defaultValues={{ title: '' }}
          fields={translatedFields}
          onSubmit={onCreateSubmit}
          submitLabel={tDialog('submit')}
          isLoading={isCreatingModule}
        />
      </DialogTemplate>
    </div>
  );
}
