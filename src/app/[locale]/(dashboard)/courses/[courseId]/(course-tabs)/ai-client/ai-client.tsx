'use client';

import { BookOpen, FileText, Sparkles, Upload, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DialogTemplate } from '@/components/custom/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatFileSize } from '../../../../inventory/inventory.utils';
import { useInventory } from '../../../../inventory/use-inventory';

interface AiClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiClientDialog({ isOpen, onOpenChange }: AiClientDialogProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const invT = useTranslations('InventoryPage');

  // Initialize with a default max size if needed, though we primarily want analytics
  const { analytics } = useInventory({ maxFileSizeBytes: 100 * 1024 * 1024 });

  const totalUsed = analytics?.totalSizeBytes ?? 0;
  const totalLimit = 2 * 1024 * 1024 * 1024; // 2GB example limit
  const usagePercentage = Math.min((totalUsed / totalLimit) * 100, 100);

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
          <div className="text-[10px] text-muted-foreground italic">
            {t('comingSoonTitle')}
          </div>
        </div>
      }
    >
      <Tabs defaultValue="personal" className="mt-4">
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

        <div className="mt-6 min-h-[450px] rounded-xl border border-dashed bg-muted/30">
          <TabsContent value="personal" className="mt-0 outline-none">
            <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
              <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                <User className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xl">{t('tabs.personal')}</h3>
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
          </TabsContent>

          <TabsContent value="course" className="mt-0 outline-none">
            <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
              <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                <BookOpen className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xl">{t('tabs.course')}</h3>
                <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                  {t('courseDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="font-bold text-primary text-xs uppercase tracking-widest">
                  {t('comingSoonTitle')}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0 outline-none">
            <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
              <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                <Upload className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xl">{t('tabs.upload')}</h3>
                <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                  {t('uploadDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="font-bold text-primary text-xs uppercase tracking-widest">
                  {t('comingSoonTitle')}
                </span>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </DialogTemplate>
  );
}
