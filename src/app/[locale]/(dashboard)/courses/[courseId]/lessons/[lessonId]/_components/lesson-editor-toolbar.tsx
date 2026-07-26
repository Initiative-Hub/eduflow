'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon';
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon';
import { LinkIcon } from '@/components/tiptap-icons/link-icon';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button';
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from '@/components/tiptap-ui/color-highlight-popover';
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from '@/components/tiptap-ui/link-popover';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import { Button as TiptapButton } from '@/components/tiptap-ui-primitive/button';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar';
import { useIsBreakpoint } from '@/hooks/use-is-breakpoint';
import { LessonEditorAiAssistant } from './lesson-editor-ai-assistant';

function MainToolbarContent({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  lessonId,
  canUseLessonAI,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  lessonId: string;
  canUseLessonAI: boolean;
}) {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <LessonEditorAiAssistant
          lessonId={lessonId}
          canUseLessonAI={canUseLessonAI}
        />
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={['bulletList', 'orderedList', 'taskList']}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {isMobile ? (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        ) : (
          <ColorHighlightPopover />
        )}
        {isMobile ? <LinkButton onClick={onLinkClick} /> : <LinkPopover />}
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>
      <Spacer />
    </>
  );
}

function MobileToolbarContent({
  type,
  onBack,
}: {
  type: 'highlighter' | 'link';
  onBack: () => void;
}) {
  return (
    <>
      <ToolbarGroup>
        <TiptapButton variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="tiptap-button-icon" />
          {type === 'highlighter' ? (
            <HighlighterIcon className="tiptap-button-icon" />
          ) : (
            <LinkIcon className="tiptap-button-icon" />
          )}
        </TiptapButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      {type === 'highlighter' ? (
        <ColorHighlightPopoverContent />
      ) : (
        <LinkContent />
      )}
    </>
  );
}

export function LessonEditorToolbar({
  lessonId,
  canUseLessonAI,
}: {
  lessonId: string;
  canUseLessonAI: boolean;
}) {
  const isMobile = useIsBreakpoint();
  const [mobileView, setMobileView] = useState<'main' | 'highlighter' | 'link'>(
    'main'
  );

  useEffect(() => {
    if (!isMobile && mobileView !== 'main') {
      setMobileView('main');
    }
  }, [isMobile, mobileView]);

  return (
    <Toolbar>
      {mobileView === 'main' ? (
        <MainToolbarContent
          onHighlighterClick={() => setMobileView('highlighter')}
          onLinkClick={() => setMobileView('link')}
          isMobile={isMobile}
          lessonId={lessonId}
          canUseLessonAI={canUseLessonAI}
        />
      ) : (
        <MobileToolbarContent
          type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
          onBack={() => setMobileView('main')}
        />
      )}
    </Toolbar>
  );
}
