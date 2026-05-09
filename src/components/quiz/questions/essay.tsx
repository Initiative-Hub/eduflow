'use client';

import {
  AlertTriangle,
  FileText,
  Image,
  Paperclip,
  PenLine,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/dropzone';
import { Textarea } from '@/components/ui/textarea';
import type { EssayQuestion } from '@/lib/quiz-template';

interface EssayProps {
  question: EssayQuestion;
  text: string;
  onTextChange: (text: string) => void;
  /** Callback when student attachments change */
  onAttachmentsChange?: (fileNames: string[]) => void;
  /** Callback when teacher rubric text changes */
  onTeacherRubricTextChange?: (text: string) => void;
  /** Callback when teacher rubric attachments change */
  onTeacherRubricAttachmentsChange?: (fileNames: string[]) => void;
  /** Current teacher rubric text */
  teacherRubricText?: string;
  showResult?: boolean;
  disabled?: boolean;
  /** Whether to show the teacher rubric input panel */
  showTeacherRubricInput?: boolean;
}

// ─── File type helpers ───────────────────────────────────────────────────────

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) {
    return <Image className="size-4 text-blue-500" />;
  }
  return <FileText className="size-4 text-orange-500" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Essay Component ─────────────────────────────────────────────────────────

export function Essay({
  question,
  text,
  onTextChange,
  onAttachmentsChange,
  onTeacherRubricTextChange,
  onTeacherRubricAttachmentsChange,
  teacherRubricText = '',
  showResult = false,
  disabled = false,
  showTeacherRubricInput = false,
}: EssayProps) {
  const t = useTranslations('Quiz');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [teacherRubricFiles, setTeacherRubricFiles] = useState<File[]>([]);

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text]
  );

  const deliveryOption = question.deliveryOption ?? 'immediate';

  const handleFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || showResult) return;
      const next = [...attachments, ...acceptedFiles];
      setAttachments(next);
      onAttachmentsChange?.(next.map((f) => f.name));
    },
    [disabled, showResult, attachments, onAttachmentsChange]
  );

  const handleRemoveFile = (index: number) => {
    const next = attachments.filter((_, i: number) => i !== index);
    setAttachments(next);
    onAttachmentsChange?.(next.map((f) => f.name));
  };

  const handleTeacherRubricFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      const next = [...teacherRubricFiles, ...acceptedFiles];
      setTeacherRubricFiles(next);
      onTeacherRubricAttachmentsChange?.(next.map((f) => f.name));
    },
    [teacherRubricFiles, onTeacherRubricAttachmentsChange]
  );

  const handleRemoveTeacherRubricFile = (index: number) => {
    const next = teacherRubricFiles.filter((_, i: number) => i !== index);
    setTeacherRubricFiles(next);
    onTeacherRubricAttachmentsChange?.(next.map((f) => f.name));
  };

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      {/* Delivery option badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {deliveryOption === 'immediate'
            ? t('essayDeliveryImmediate')
            : t('essayDeliveryTeacherReview')}
        </Badge>
        {deliveryOption === 'teacher-review' && (
          <span className="text-muted-foreground text-xs">
            {t('essayDeliveryTeacherReviewHint')}
          </span>
        )}
      </div>

      {/* ─── Student Answer Section ─────────────────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <PenLine className="size-4 text-primary" />
          <p className="font-medium text-foreground text-sm">
            {t('essayStudentAnswer')}
          </p>
        </div>

        {/* Text input area */}
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled || showResult}
            placeholder={t('essayPlaceholder')}
            className="min-h-36 resize-y"
            rows={6}
          />
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>
              {t('essayWordCount', { count: wordCount })}
              {question.minWords &&
                ` / ${t('essayMinWords', { count: question.minWords })}`}
              {question.maxWords &&
                ` / ${t('essayMaxWords', { count: question.maxWords })}`}
            </span>
            {question.maxWords && wordCount > question.maxWords && (
              <span className="text-red-500">{t('essayOverLimit')}</span>
            )}
          </div>
        </div>

        {/* Word count warning */}
        {question.minWords &&
          wordCount > 0 &&
          wordCount < question.minWords &&
          !showResult && (
            <p className="text-amber-600 text-xs">
              {t('essayBelowMinWords', {
                count: question.minWords - wordCount,
              })}
            </p>
          )}

        {/* Student file attachments */}
        {question.allowAttachments && !showResult && !disabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="size-3.5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t('essayAttachments')}
              </p>
            </div>

            <Dropzone
              src={attachments.length > 0 ? attachments : undefined}
              onDrop={handleFileDrop}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                  ['.docx'],
              }}
              maxSize={10 * 1024 * 1024}
              maxFiles={5}
              className="w-full"
            >
              <DropzoneContent>
                <p className="font-medium text-sm">
                  {t('essayFilesAttached', { count: attachments.length })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('essayDropzoneReplace')}
                </p>
              </DropzoneContent>
              <DropzoneEmptyState>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Paperclip size={16} />
                  </div>
                  <p className="my-2 font-medium text-sm">
                    {t('essayDropzoneTitle')}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t('essayDropzoneHint')}
                  </p>
                </div>
              </DropzoneEmptyState>
            </Dropzone>
          </div>
        )}

        {/* Attached files list (student) */}
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                {getFileIcon(file)}
                <span className="flex-1 truncate text-foreground">
                  {file.name}
                </span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatFileSize(file.size)}
                </span>
                {!showResult && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveFile(index)}
                    aria-label={t('essayRemoveFile')}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Teacher Rubric Input Section ───────────────────────────────────── */}
      {(showTeacherRubricInput || question.allowTeacherRubric) && (
        <div className="space-y-3 rounded-lg border border-amber-300 border-dashed bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="font-medium text-amber-800 text-sm dark:text-amber-200">
              {t('essayTeacherRubricTitle')}
            </p>
          </div>
          <p className="text-amber-700 text-xs dark:text-amber-300">
            {t('essayTeacherRubricDescription')}
          </p>

          {/* Teacher rubric text input */}
          <Textarea
            value={teacherRubricText}
            onChange={(e) => onTeacherRubricTextChange?.(e.target.value)}
            placeholder={t('essayTeacherRubricPlaceholder')}
            className="min-h-24 resize-y"
            rows={4}
          />

          {/* Teacher rubric file upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="size-3.5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t('essayTeacherRubricAttachments')}
              </p>
            </div>

            <Dropzone
              src={
                teacherRubricFiles.length > 0 ? teacherRubricFiles : undefined
              }
              onDrop={handleTeacherRubricFileDrop}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                  ['.docx'],
                'text/plain': ['.txt'],
              }}
              maxSize={10 * 1024 * 1024}
              maxFiles={5}
              className="w-full"
            >
              <DropzoneContent>
                <p className="font-medium text-sm">
                  {t('essayFilesAttached', {
                    count: teacherRubricFiles.length,
                  })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('essayDropzoneReplace')}
                </p>
              </DropzoneContent>
              <DropzoneEmptyState>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Paperclip size={16} />
                  </div>
                  <p className="my-2 font-medium text-sm">
                    {t('essayTeacherRubricUploadTitle')}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t('essayTeacherRubricUploadHint')}
                  </p>
                </div>
              </DropzoneEmptyState>
            </Dropzone>
          </div>

          {/* Teacher rubric attached files list */}
          {teacherRubricFiles.length > 0 && (
            <div className="space-y-1.5">
              {teacherRubricFiles.map((file, index) => (
                <div
                  key={`rubric-${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  {getFileIcon(file)}
                  <span className="flex-1 truncate text-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveTeacherRubricFile(index)}
                    aria-label={t('essayRemoveFile')}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show result / explanation */}
      {showResult && question.explanation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/20">
          <p className="font-medium text-blue-800 dark:text-blue-200">
            {t('explanation')}
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
