'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Plus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import { inventoryService } from '../../../inventory/inventory.service';
import { AddLessonDialog } from '../_components/add-lesson-dialog';
import { AddModuleDialog } from '../_components/add-module-dialog';
import { ModuleAccordionItem } from '../_components/module-accordion-item';
import type { CreateLessonFormData } from '../create-lesson.config';
import type { CreateModuleFormData } from '../create-module.config';
import { useModules } from '../use-modules';
import { AiClientDialog } from './ai-client/ai-client';

interface CourseModulesClientProps {
  courseId: string;
}

export function CourseModulesClient({ courseId }: CourseModulesClientProps) {
  const t = useTranslations('Courses.CourseModules');

  const {
    modules,
    isLoading,
    isCreatingModule,
    handleCreateModule,
    isCreatingLesson,
    handleCreateLesson,
  } = useModules(courseId);

  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const fileRef = useRef<File | null>(null);

  const {
    object: streamingCourse,
    submit,
    isLoading: isStreaming,
  } = useObject({
    api: '/api/v1/ai/courses',
    schema: aiCourseGenerationSchema,
    onFinish: async () => {
      setIsSaving(true);
      // Give the server time to run the database save transactions
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      setIsSaving(false);
      toast.success(t('AiGeneration.success'));
    },
    onError: (error) => {
      toast.error(t('AiGeneration.failed'));
      console.error(error);
    },
    fetch: async (url, init) => {
      if (fileRef.current && init?.body) {
        const parsedBody = JSON.parse(init.body as string);
        const formData = new FormData();
        formData.append('courseId', parsedBody.courseId);
        if (parsedBody.apiKey) formData.append('apiKey', parsedBody.apiKey);
        formData.append('file', fileRef.current);

        const headers = new Headers(init.headers);
        // Remove Content-Type so browser sets it to multipart/form-data with correct boundary
        headers.delete('Content-Type');

        const newInit = { ...init, headers, body: formData };
        // Clear the ref so we don't accidentally send it again on retries/future requests
        fileRef.current = null;

        return fetch(url, newInit);
      }
      return fetch(url, init);
    },
  });

  const onCreateModule = (data: CreateModuleFormData) => {
    handleCreateModule(
      { title: data.title },
      { onSuccess: () => setIsAddModuleOpen(false) }
    );
  };

  const onCreateLesson = (data: CreateLessonFormData) => {
    if (activeModuleIdForLesson) {
      handleCreateLesson(
        { moduleId: activeModuleIdForLesson, title: data.title },
        { onSuccess: () => setActiveModuleIdForLesson(null) }
      );
    }
  };

  const onAiSelect = async (selection: { fileId?: string; file?: File }) => {
    setIsAiOpen(false);

    try {
      if (selection.file) {
        fileRef.current = selection.file;
        submit({ courseId });
        toast.success(t('AiGeneration.documentReceived'));
      } else if (selection.fileId) {
        submit({ fileId: selection.fileId, courseId });
        toast.success(t('AiGeneration.startingGeneration'));
      }
    } catch (error) {
      console.error('AI selection error:', error);
      toast.error(t('AiGeneration.error'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary"
            onClick={() => setIsAiOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            {t('aiAssistant')}
          </Button>
          <Button onClick={() => setIsAddModuleOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('addModule')}
          </Button>
        </div>
      </div>

      {(isStreaming || isSaving) && streamingCourse && (
        <div className="fade-in slide-in-from-top-4 animate-in space-y-6 rounded-xl border-2 border-primary/20 border-dashed bg-primary/5 p-6 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-none">
                  {streamingCourse.courseTitle || t('AiGeneration.generatingCourse')}
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  {isSaving ? t('AiGeneration.savingModules') : t('AiGeneration.craftingCurriculum')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1 shadow-sm ring-1 ring-border">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="font-medium text-[10px] uppercase tracking-wider">
                {isSaving ? t('AiGeneration.saving') : t('AiGeneration.processingContent')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {streamingCourse.modules?.map((module, mIdx) => (
              <div
                key={mIdx}
                className="overflow-hidden rounded-lg border bg-background shadow-sm"
              >
                <div className="border-b bg-muted/30 px-4 py-3">
                  <h4 className="font-bold text-sm">
                    {mIdx + 1}. {module?.title || t('AiGeneration.identifyingModule')}
                  </h4>
                </div>
                <div className="divide-y">
                  {module?.lessons?.map((lesson, lIdx) => (
                    <div
                      key={lIdx}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium text-xs">
                        {lesson?.lessonTitle || t('AiGeneration.draftingLesson')}
                      </span>
                    </div>
                  ))}
                  {!module?.lessons?.length && (
                    <div className="flex items-center gap-3 p-3 opacity-50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <span className="text-xs italic">
                        {t('AiGeneration.creatingLessons')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-full rounded-md bg-muted" />
          <div className="h-16 w-full rounded-md bg-muted" />
        </div>
      ) : modules.length === 0 && !isStreaming && !isSaving ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center text-muted-foreground">
          {t('noModules')}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {modules.map((moduleItem) => (
            <ModuleAccordionItem
              key={moduleItem.id}
              moduleItem={moduleItem}
              courseId={courseId}
              onAddLesson={setActiveModuleIdForLesson}
            />
          ))}
        </Accordion>
      )}

      <AddModuleDialog
        isOpen={isAddModuleOpen}
        onOpenChange={setIsAddModuleOpen}
        onSubmit={onCreateModule}
        isLoading={isCreatingModule}
      />

      <AddLessonDialog
        isOpen={!!activeModuleIdForLesson}
        onOpenChange={(open) => !open && setActiveModuleIdForLesson(null)}
        onSubmit={onCreateLesson}
        isLoading={isCreatingLesson}
      />

      <AiClientDialog
        isOpen={isAiOpen}
        onOpenChange={setIsAiOpen}
        onSelect={onAiSelect}
      />
    </div>
  );
}
