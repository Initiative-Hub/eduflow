import {
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { InventoryEntry } from '../../../../inventory/inventory.types';
import { ResourceBrowser } from './ai-client-resource-browser';

type SelectPanelProps = {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  personalFiles?: { data: InventoryEntry[] } | undefined;
  isLoadingPersonal: boolean;
  currentParentId: string | null;
  currentPathName: string;
  selectedPersonalId: string | null;
  onPersonalBack: () => void;
  onPersonalEntryClick: (entry: InventoryEntry) => void;
  courseFiles?: { data: InventoryEntry[] } | undefined;
  isLoadingCourse: boolean;
  courseParentId: string | null;
  coursePathName: string;
  selectedCourseId: string | null;
  onCourseBack: () => void;
  onCourseEntryClick: (entry: InventoryEntry) => void;
  uploadedFile: File | null;
  isProcessing: boolean;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearUpload: () => void;
};

export function AiClientSelectPanel({
  activeTab,
  onActiveTabChange,
  personalFiles,
  isLoadingPersonal,
  currentParentId,
  currentPathName,
  selectedPersonalId,
  onPersonalBack,
  onPersonalEntryClick,
  courseFiles,
  isLoadingCourse,
  courseParentId,
  coursePathName,
  selectedCourseId,
  onCourseBack,
  onCourseEntryClick,
  uploadedFile,
  isProcessing,
  onFileUpload,
  onClearUpload,
}: SelectPanelProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');

  return (
    <Tabs value={activeTab} onValueChange={onActiveTabChange} className="mt-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal" className="gap-2">
          <User className="h-4 w-4" />
          {t('tabs.personal')}
        </TabsTrigger>
        <TabsTrigger value="course" className="gap-2">
          <BookOpen className="h-4 w-4" />
          {t('tabs.course')}
        </TabsTrigger>
        <TabsTrigger value="upload" className="gap-2">
          <Upload className="h-4 w-4" />
          {t('tabs.upload')}
        </TabsTrigger>
      </TabsList>

      <div className="mt-6 h-100 overflow-hidden rounded-xl border border-dashed bg-muted/30">
        <TabsContent value="personal" className="mt-0 outline-none">
          <ResourceBrowser
            entries={personalFiles}
            isLoading={isLoadingPersonal}
            currentParentId={currentParentId}
            pathName={currentPathName}
            selectedId={selectedPersonalId}
            onBack={onPersonalBack}
            onEntryClick={onPersonalEntryClick}
            emptyIcon={User}
            emptyTitle={t('tabs.personal')}
            emptyDescription={t('personalDescription')}
          />
        </TabsContent>

        <TabsContent value="course" className="mt-0 outline-none">
          <ResourceBrowser
            entries={courseFiles}
            isLoading={isLoadingCourse}
            currentParentId={courseParentId}
            pathName={coursePathName}
            selectedId={selectedCourseId}
            onBack={onCourseBack}
            onEntryClick={onCourseEntryClick}
            emptyIcon={BookOpen}
            emptyTitle={t('tabs.course')}
            emptyDescription={t('courseDescription')}
          />
        </TabsContent>

        <TabsContent
          value="upload"
          className="mt-0 flex h-full flex-col outline-none"
        >
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            {uploadedFile ? (
              <div className="fade-in zoom-in-95 flex w-full max-w-md animate-in flex-col items-center space-y-6 rounded-2xl border-2 border-primary bg-background p-8 shadow-lg">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-10 w-10" />
                  </div>
                  <div className="absolute -right-1 -bottom-1 rounded-full bg-primary p-1.5 text-white ring-4 ring-background">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl">{uploadedFile.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('readyForAi')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearUpload}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('uploadDifferent')}
                </Button>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
                  <Upload className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{t('processingPdf')}</p>
                  <p className="text-muted-foreground text-sm">
                    {t('preparingDocument')}
                  </p>
                </div>
              </div>
            ) : (
              <label className="group relative flex w-full max-w-xl cursor-pointer flex-col items-center justify-center space-y-6 rounded-2xl border-2 border-muted-foreground/25 border-dashed bg-background/50 py-16 transition-all hover:border-primary/50 hover:bg-primary/5">
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={onFileUpload}
                />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Upload className="h-10 w-10" />
                </div>
                <div className="space-y-2 px-6">
                  <h3 className="font-bold text-xl">{t('uploadReference')}</h3>
                  <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                    {t('uploadDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-1.5 font-bold text-[10px] text-muted-foreground uppercase tracking-widest transition-colors group-hover:bg-primary/20 group-hover:text-primary">
                  {t('clickToBrowse')}
                </div>
              </label>
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
