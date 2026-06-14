'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Youtube } from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type TiptapDocument } from '@/utils/lesson-content';
import type { JSONContent } from '@tiptap/core';

interface LessonPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: TiptapDocument;
}

export function LessonPresentation({
  isOpen,
  onClose,
  title,
  content,
}: LessonPresentationProps) {
  const t = useTranslations('Courses.LessonPresentation');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Split content into slides
  const slides = useMemo(() => {
    if (!content || !content.content || content.content.length === 0) {
      return [[]];
    }
    const list: JSONContent[][] = [];
    let current: JSONContent[] = [];

    // Check if there is any horizontal rule in the content
    const hasHR = content.content.some(
      (node) => node.type === 'horizontalRule'
    );

    for (const node of content.content) {
      if (hasHR) {
        if (node.type === 'horizontalRule') {
          if (current.length > 0) {
            list.push(current);
            current = [];
          }
        } else {
          current.push(node);
        }
      } else {
        // Fallback: Split by H1 or H2 headings
        if (
          node.type === 'heading' &&
          (node.attrs?.level === 1 || node.attrs?.level === 2)
        ) {
          if (current.length > 0) {
            list.push(current);
            current = [node];
          } else {
            current.push(node);
          }
        } else {
          current.push(node);
        }
      }
    }

    if (current.length > 0) {
      list.push(current);
    }

    return list.length > 0 ? list : [[]];
  }, [content]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class:
          'lesson-tiptap-editor ProseMirror max-w-none text-slate-100 outline-none',
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: true,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Youtube.configure({
        addPasteHandler: true,
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
    ],
    content: {
      type: 'doc',
      content: slides[0] || [],
    },
  });

  // Sync editor content with active slide
  useEffect(() => {
    if (editor && slides[currentSlideIndex]) {
      editor.commands.setContent({
        type: 'doc',
        content: slides[currentSlideIndex],
      });
    }
  }, [editor, currentSlideIndex, slides]);

  // Fullscreen support
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen mode:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Failed to exit fullscreen mode:', err);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, slides.length]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-6 text-slate-100 select-none md:p-10 rounded-2xl border border-slate-800 shadow-xl min-h-[75vh] w-full m-0',
        isFullscreen &&
          'fixed inset-0 z-[9999] rounded-none border-none w-screen h-screen m-0'
      )}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {t('title')}
          </span>
          <h2 className="mt-2 max-w-md truncate text-lg font-bold text-slate-200 md:max-w-xl lg:max-w-2xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            onClick={toggleFullscreen}
            title={t('fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-950/20 hover:text-red-400"
            onClick={onClose}
            title={t('close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden py-8 px-4">
        <div
          className={cn(
            'lesson-presentation-content w-full overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 md:p-12',
            isFullscreen ? 'h-[65vh] max-h-[65vh]' : 'h-[45vh] max-h-[45vh]'
          )}
        >
          {slides[currentSlideIndex]?.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500 italic">
              {t('empty')}
            </div>
          ) : (
            editor && <EditorContent editor={editor} />
          )}
        </div>
      </div>

      {/* Footer / Navigation */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-4 md:flex-row">
        <p className="order-3 text-xs text-slate-500 font-medium md:order-1">
          {t('keyboardTip')}
        </p>

        <div className="order-1 flex items-center gap-4 md:order-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900/60 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
            onClick={() =>
              setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))
            }
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            {t('previous')}
          </Button>

          <span className="min-w-28 text-center text-sm font-semibold text-slate-400">
            {t('slideProgress', {
              current: currentSlideIndex + 1,
              total: slides.length,
            })}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900/60 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
            onClick={() =>
              setCurrentSlideIndex((prev) =>
                Math.min(prev + 1, slides.length - 1)
              )
            }
            disabled={currentSlideIndex === slides.length - 1}
          >
            {t('next')}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div className="order-2 w-9 md:order-3" />
      </div>
    </div>
  );
}
