'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  ChevronLeft,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { inventoryService } from '../../../../inventory/inventory.service';
import type { InventoryEntry } from '../../../../inventory/inventory.types';
import { formatFileSize } from '../../../../inventory/inventory.utils';
import { useInventory } from '../../../../inventory/use-inventory';
import { courseFilesService } from '../files/course-files.service';

interface AiClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: { fileId?: string; file?: File }) => void;
}

export function AiClientDialog({
  isOpen,
  onOpenChange,
  onSelect,
}: AiClientDialogProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const invT = useTranslations('InventoryPage');
  const { courseId } = useParams() as { courseId: string };
  const [activeTab, setActiveTab] = useState('personal');

  // Personal files state
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<
    { id: string | null; name: string }[]
  >([]);
  const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(
    null
  );

  // Course files state
  const [courseParentId, setCourseParentId] = useState<string | null>(null);
  const [coursePathHistory, setCoursePathHistory] = useState<
    { id: string | null; name: string }[]
  >([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { analytics } = useInventory({ maxFileSizeBytes: 100 * 1024 * 1024 });

  const totalUsed = analytics?.totalSizeBytes ?? 0;
  const totalLimit = 2 * 1024 * 1024 * 1024;
  const usagePercentage = Math.min((totalUsed / totalLimit) * 100, 100);

  const { data: personalFiles, isLoading: isLoadingPersonal } = useQuery({
    queryKey: ['ai-assistant', 'personal-files', currentParentId],
    queryFn: () =>
      inventoryService.list({
        parentId: currentParentId,
        limit: 100,
        offset: 0,
      }),
    enabled: isOpen && activeTab === 'personal',
  });

  const { data: courseFiles, isLoading: isLoadingCourse } = useQuery({
    queryKey: ['ai-assistant', 'course-files', courseId, courseParentId],
    queryFn: () =>
      courseFilesService.list({
        courseId,
        parentId: courseParentId,
        limit: 100,
        offset: 0,
      }),
    enabled: isOpen && activeTab === 'course',
  });

  const handleEntryClick = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      setPathHistory((prev) => [
        ...prev,
        { id: currentParentId, name: entry.name },
      ]);
      setCurrentParentId(entry.id);
    } else if (entry.mimeType === 'application/pdf') {
      setSelectedPersonalId((prev) => (prev === entry.id ? null : entry.id));
      setSelectedCourseId(null); // Clear other tab selection
      setUploadedFile(null); // Clear uploaded file
    }
  };

  const handleCourseEntryClick = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      setCoursePathHistory((prev) => [
        ...prev,
        { id: courseParentId, name: entry.name },
      ]);
      setCourseParentId(entry.id);
    } else if (entry.mimeType === 'application/pdf') {
      setSelectedCourseId((prev) => (prev === entry.id ? null : entry.id));
      setSelectedPersonalId(null); // Clear other tab selection
      setUploadedFile(null); // Clear uploaded file
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      return;
    }

    setIsProcessing(true);
    setSelectedPersonalId(null);
    setSelectedCourseId(null);
    // Simulate a brief "processing" delay for better UX
    setTimeout(() => {
      setUploadedFile(file);
      setIsProcessing(false);
    }, 800);
  };

  const handleBack = () => {
    const lastPath = pathHistory[pathHistory.length - 1];
    if (lastPath) {
      setCurrentParentId(lastPath.id);
      setPathHistory((prev) => prev.slice(0, -1));
    } else if (currentParentId !== null) {
      setCurrentParentId(null);
    }
  };

  const handleCourseBack = () => {
    const lastPath = coursePathHistory[coursePathHistory.length - 1];
    if (lastPath) {
      setCourseParentId(lastPath.id);
      setCoursePathHistory((prev) => prev.slice(0, -1));
    } else if (courseParentId !== null) {
      setCourseParentId(null);
    }
  };

  const currentPathName = useMemo(() => {
    if (pathHistory.length === 0) return t('tabs.personal');
    return pathHistory[pathHistory.length - 1].name;
  }, [pathHistory, t]);

  const coursePathName = useMemo(() => {
    if (coursePathHistory.length === 0) return t('tabs.course');
    return coursePathHistory[coursePathHistory.length - 1].name;
  }, [coursePathHistory, t]);

  const canSubmit =
    activeTab === 'personal'
      ? !!selectedPersonalId
      : activeTab === 'course'
        ? !!selectedCourseId
        : !!uploadedFile;

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="sm:max-w-5xl"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>{t('title')}</span>
        </div>
      }
      description={t('description')}
      footer={
        <div className="flex w-full items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                {invT('storage.label')}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                <span className="font-medium text-xs">
                  {invT('storage.usage', {
                    used: formatFileSize(totalUsed),
                    total: formatFileSize(totalLimit),
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-muted-foreground italic">
              {t('comingSoonTitle')}
            </div>
            <Button
              disabled={!canSubmit}
              size="sm"
              onClick={() => {
                if (activeTab === 'personal' && selectedPersonalId) {
                  onSelect({ fileId: selectedPersonalId });
                } else if (activeTab === 'course' && selectedCourseId) {
                  onSelect({ fileId: selectedCourseId });
                } else if (activeTab === 'upload' && uploadedFile) {
                  onSelect({ file: uploadedFile });
                }
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              {t('useSelected')}
            </Button>
          </div>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
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

        <div className="mt-6 min-h-[450px] overflow-hidden rounded-xl border border-dashed bg-muted/30">
          <TabsContent
            value="personal"
            className="mt-0 flex h-[450px] flex-col outline-none"
          >
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
              <div className="flex items-center gap-2">
                {(pathHistory.length > 0 || currentParentId !== null) && (
                  <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="font-medium text-muted-foreground text-sm">
                  {currentPathName}
                </span>
              </div>
              {selectedPersonalId && (
                <span className="flex items-center gap-1 font-medium text-primary text-xs">
                  <Check className="h-3 w-3" />
                  {t('selectedPdf', { count: 1 })}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingPersonal ? (
                <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">{t('loadingFiles')}</p>
                </div>
              ) : personalFiles?.data.length ? (
                <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3">
                  {personalFiles.data.map((file) => {
                    const isPdf = file.mimeType === 'application/pdf';
                    const isSelected = selectedPersonalId === file.id;
                    const canClick = file.isFolder || isPdf;

                    return (
                      <div
                        key={file.id}
                        onClick={() => canClick && handleEntryClick(file)}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg border bg-background p-3 transition-all',
                          canClick
                            ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                            : 'cursor-not-allowed opacity-50 grayscale',
                          isSelected && 'border-primary ring-1 ring-primary'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 text-primary transition-colors',
                            canClick &&
                              'group-hover:bg-primary group-hover:text-white',
                            isSelected && 'bg-primary text-white'
                          )}
                        >
                          {file.isFolder ? (
                            <BookOpen className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-medium text-sm">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.isFolder
                              ? t('folder')
                              : formatFileSize(file.fileSize ?? 0)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
                  <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                    <User className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xl">
                      {t('tabs.personal')}
                    </h3>
                    <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                      {t('personalDescription')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                    <span className="font-bold text-primary text-xs uppercase tracking-widest">
                      {t('comingSoonTitle')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="course"
            className="mt-0 flex h-[450px] flex-col outline-none"
          >
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
              <div className="flex items-center gap-2">
                {(coursePathHistory.length > 0 || courseParentId !== null) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCourseBack}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="font-medium text-muted-foreground text-sm">
                  {coursePathName}
                </span>
              </div>
              {selectedCourseId && (
                <span className="flex items-center gap-1 font-medium text-primary text-xs">
                  <Check className="h-3 w-3" />
                  {t('selectedPdf', { count: 1 })}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingCourse ? (
                <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">{t('loadingFiles')}</p>
                </div>
              ) : courseFiles?.data.length ? (
                <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3">
                  {courseFiles.data.map((file) => {
                    const isPdf = file.mimeType === 'application/pdf';
                    const isSelected = selectedCourseId === file.id;
                    const canClick = file.isFolder || isPdf;

                    return (
                      <div
                        key={file.id}
                        onClick={() => canClick && handleCourseEntryClick(file)}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg border bg-background p-3 transition-all',
                          canClick
                            ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                            : 'cursor-not-allowed opacity-50 grayscale',
                          isSelected && 'border-primary ring-1 ring-primary'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 text-primary transition-colors',
                            canClick &&
                              'group-hover:bg-primary group-hover:text-white',
                            isSelected && 'bg-primary text-white'
                          )}
                        >
                          {file.isFolder ? (
                            <BookOpen className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-medium text-sm">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.isFolder
                              ? t('folder')
                              : formatFileSize(file.fileSize ?? 0)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
                  <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                    <BookOpen className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xl">
                      {t('tabs.course')}
                    </h3>
                    <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                      {t('courseDescription')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="upload"
            className="mt-0 flex h-full flex-col outline-none"
          >
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              {uploadedFile ? (
                <div className="fade-in zoom-in-95 flex w-full max-w-md animate-in flex-col items-center space-y-6 rounded-2xl border-2 border-primary bg-background p-8 shadow-lg transition-all">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <FileText className="h-10 w-10" />
                    </div>
                    <div className="absolute -right-1 -bottom-1 rounded-full bg-primary p-1.5 text-white ring-4 ring-background">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl">{uploadedFile.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {formatFileSize(uploadedFile.size)} • {t('readyForAi')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
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
                    <p className="font-semibold text-lg">
                      {t('processingPdf')}
                    </p>
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
                    onChange={handleFileUpload}
                  />
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Upload className="h-10 w-10" />
                  </div>
                  <div className="space-y-2 px-6">
                    <h3 className="font-bold text-xl">
                      {t('uploadReference')}
                    </h3>
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
    </DialogTemplate>
  );
}
