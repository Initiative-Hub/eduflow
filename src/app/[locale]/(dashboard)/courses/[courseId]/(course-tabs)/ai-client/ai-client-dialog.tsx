'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, MessageSquare, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import type { SearchSourcesState } from '@/lib/course-generation/stream-state';
import { inventoryService } from '../../../../inventory/inventory.service';
import type { InventoryEntry } from '../../../../inventory/inventory.types';
import { formatFileSize } from '../../../../inventory/inventory.utils';
import { useInventory } from '../../../../inventory/use-inventory';
import type {
  GenerationStep,
  StreamingCourse,
} from '../../use-generate-course';
import { courseFilesService } from '../files/course-files.service';
import { AiClientContextPanel } from './ai-client-context-panel';
import { AiClientGeneratingPanel } from './ai-client-generating-panel';
import { AiClientSelectPanel } from './ai-client-select-panel';

interface AiClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => void;
  onRetry?: (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => void;
  generationStep?: GenerationStep;
  generationError?: string | null;
  isRunning?: boolean;
  streamingCourse?: StreamingCourse | null;
  searchSources?: SearchSourcesState;
}

type DialogPhase = 'select' | 'context' | 'generating';

export function AiClientDialog({
  isOpen,
  onOpenChange,
  onSelect,
  onRetry,
  generationStep = 'idle',
  generationError = null,
  isRunning = false,
  streamingCourse,
  searchSources,
}: AiClientDialogProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const genT = useTranslations('Courses.CourseModules.AiGeneration');
  const invT = useTranslations('InventoryPage');
  const { courseId } = useParams() as { courseId: string };

  const [phase, setPhase] = useState<DialogPhase>('select');
  const [activeTab, setActiveTab] = useState('personal');

  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<
    { id: string | null; name: string }[]
  >([]);
  const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(
    null
  );

  const [courseParentId, setCourseParentId] = useState<string | null>(null);
  const [coursePathHistory, setCoursePathHistory] = useState<
    { id: string | null; name: string }[]
  >([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [selectedPersonalName, setSelectedPersonalName] = useState<
    string | null
  >(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [context, setContext] = useState('');
  const [lastSelection, setLastSelection] = useState<{
    fileId?: string;
    file?: File;
    context?: string;
  } | null>(null);

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
    enabled: isOpen && activeTab === 'personal' && phase === 'select',
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

  useEffect(() => {
    if (phase === 'generating' && generationStep === 'done') {
      const timer = setTimeout(() => {
        setPhase('select');
        setContext('');
        setLastSelection(null);
        onOpenChange(false);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [phase, generationStep, onOpenChange]);

  const handleEntryClick = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      setPathHistory((prev) => [
        ...prev,
        { id: currentParentId, name: entry.name },
      ]);
      setCurrentParentId(entry.id);
    } else if (entry.mimeType === 'application/pdf') {
      const isSelected = selectedPersonalId === entry.id;
      setSelectedPersonalId(isSelected ? null : entry.id);
      setSelectedPersonalName(isSelected ? null : entry.name);
      setSelectedCourseId(null);
      setUploadedFile(null);
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
      const isSelected = selectedCourseId === entry.id;
      setSelectedCourseId(isSelected ? null : entry.id);
      setSelectedPersonalName(isSelected ? null : entry.name);
      setSelectedPersonalId(null);
      setUploadedFile(null);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type !== 'application/pdf') return;
    setIsProcessing(true);
    setSelectedPersonalId(null);
    setSelectedCourseId(null);
    setTimeout(() => {
      setUploadedFile(file);
      setIsProcessing(false);
    }, 800);
  };

  const handleBack = () => {
    const last = pathHistory[pathHistory.length - 1];
    if (last) {
      setCurrentParentId(last.id);
      setPathHistory((p) => p.slice(0, -1));
    } else if (currentParentId !== null) setCurrentParentId(null);
  };

  const handleCourseBack = () => {
    const last = coursePathHistory[coursePathHistory.length - 1];
    if (last) {
      setCourseParentId(last.id);
      setCoursePathHistory((p) => p.slice(0, -1));
    } else if (courseParentId !== null) setCourseParentId(null);
  };

  const handleProceedToContext = () => setPhase('context');
  const handleBackToSelect = () => {
    setPhase('select');
    setContext('');
  };

  const handleGenerate = () => {
    const selection =
      activeTab === 'personal' && selectedPersonalId
        ? { fileId: selectedPersonalId, context: context.trim() || undefined }
        : activeTab === 'course' && selectedCourseId
          ? { fileId: selectedCourseId, context: context.trim() || undefined }
          : uploadedFile
            ? { file: uploadedFile, context: context.trim() || undefined }
            : null;
    if (!selection) return;
    setLastSelection(selection);
    setPhase('generating');
    onSelect(selection);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isRunning && generationStep !== 'error') return;
    if (!open) {
      setPhase('select');
      setContext('');
      setLastSelection(null);
    }
    onOpenChange(open);
  };

  const currentPathName = useMemo(() => {
    if (pathHistory.length === 0) return t('tabs.personal');
    return pathHistory[pathHistory.length - 1].name;
  }, [pathHistory, t]);

  const coursePathName = useMemo(() => {
    if (coursePathHistory.length === 0) return t('tabs.course');
    return coursePathHistory[coursePathHistory.length - 1].name;
  }, [coursePathHistory, t]);

  const canProceed =
    activeTab === 'personal'
      ? !!selectedPersonalId
      : activeTab === 'course'
        ? !!selectedCourseId
        : !!uploadedFile;

  const selectedDocumentName =
    activeTab === 'personal' || activeTab === 'course'
      ? selectedPersonalName
      : (uploadedFile?.name ?? null);

  const dialogTitle =
    phase === 'generating' ? (
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <span>{genT('generatingCourse')}</span>
      </div>
    ) : phase === 'context' ? (
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <span>{t('contextTab.title')}</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <span>{t('title')}</span>
      </div>
    );

  const dialogDescription =
    phase === 'generating'
      ? genT('craftingCurriculum')
      : phase === 'context'
        ? t('contextTab.description')
        : t('description');

  const selectFooter = (
    <div className="flex w-full items-center justify-between px-1">
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
      <div className="flex items-center gap-3">
        <div className="text-[10px] text-muted-foreground italic">
          {t('comingSoonTitle')}
        </div>
        <Button
          disabled={!canProceed}
          size="sm"
          onClick={handleProceedToContext}
        >
          <Check className="mr-2 h-4 w-4" />
          {t('useSelected')}
        </Button>
      </div>
    </div>
  );

  const contextFooter = (
    <div className="flex w-full items-center justify-between px-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBackToSelect}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('contextTab.back')}
      </Button>
      <Button size="sm" onClick={handleGenerate} className="gap-2">
        <Sparkles className="h-4 w-4" />
        {t('contextTab.generate')}
      </Button>
    </div>
  );

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      className={
        phase === 'generating'
          ? 'sm:max-w-3xl'
          : phase === 'context'
            ? 'sm:max-w-2xl'
            : 'sm:max-w-5xl'
      }
      title={dialogTitle}
      description={dialogDescription}
      footer={
        phase === 'generating'
          ? undefined
          : phase === 'context'
            ? contextFooter
            : selectFooter
      }
    >
      {phase === 'generating' ? (
        <AiClientGeneratingPanel
          generationStep={generationStep}
          generationError={generationError}
          streamingCourse={streamingCourse}
          searchSources={searchSources}
          lastSelection={lastSelection}
          onDismiss={() => handleOpenChange(false)}
          onRetry={onRetry}
        />
      ) : phase === 'context' ? (
        <AiClientContextPanel
          selectedDocumentName={selectedDocumentName}
          context={context}
          onContextChange={setContext}
        />
      ) : (
        <AiClientSelectPanel
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          personalFiles={personalFiles}
          isLoadingPersonal={isLoadingPersonal}
          currentParentId={currentParentId}
          currentPathName={currentPathName}
          selectedPersonalId={selectedPersonalId}
          onPersonalBack={handleBack}
          onPersonalEntryClick={handleEntryClick}
          courseFiles={courseFiles}
          isLoadingCourse={isLoadingCourse}
          courseParentId={courseParentId}
          coursePathName={coursePathName}
          selectedCourseId={selectedCourseId}
          onCourseBack={handleCourseBack}
          onCourseEntryClick={handleCourseEntryClick}
          uploadedFile={uploadedFile}
          isProcessing={isProcessing}
          onFileUpload={handleFileUpload}
          onClearUpload={() => setUploadedFile(null)}
        />
      )}
    </DialogTemplate>
  );
}
