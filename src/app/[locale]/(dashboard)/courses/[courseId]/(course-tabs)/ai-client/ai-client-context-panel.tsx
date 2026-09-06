import { Check, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AiClientContextPanelProps = {
  selectedDocumentName: string | null;
  context: string;
  onContextChange: (value: string) => void;
};

export function AiClientContextPanel({
  selectedDocumentName,
  context,
  onContextChange,
}: AiClientContextPanelProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');

  return (
    <div className="mt-4 space-y-5">
      {selectedDocumentName && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('contextTab.selectedFile')}
            </p>
            <p className="truncate font-medium text-sm">
              {selectedDocumentName}
            </p>
          </div>
          <div className="rounded-full bg-primary p-1 text-white">
            <Check className="h-3 w-3" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ai-context" className="font-medium text-sm">
          {t('contextTab.label')}
        </Label>
        <Textarea
          id="ai-context"
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder={t('contextTab.placeholder')}
          className="min-h-45 resize-none text-sm"
          maxLength={2000}
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {context.length} / 2000
        </p>
      </div>
    </div>
  );
}
