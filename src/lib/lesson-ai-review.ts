import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { ChangeSet, type TokenEncoder } from '@tiptap/pm/changeset';
import { DOMSerializer, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { LessonAiProposal } from '@/lib/lesson-ai-edit';

type LessonAiReviewMeta =
  | { decorations: DecorationSet; type: 'set' }
  | { type: 'clear' };

const lessonAiReviewPluginKey = new PluginKey<DecorationSet>('lessonAiReview');
const lessonAiReviewActiveClass = 'lesson-ai-review-active';

export class LessonAiReviewError extends Error {
  constructor(public readonly reason: 'noChanges' | 'unableToPreview') {
    super(reason);
  }
}

function stableValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? String(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
    .join(',')}}`;
}

const reviewTokenEncoder: TokenEncoder<string> = {
  compareTokens: (left, right) => left === right,
  encodeCharacter: (character, marks) =>
    `text:${character}:${marks
      .map((mark) => `${mark.type.name}:${stableValue(mark.attrs)}`)
      .join('|')}`,
  encodeNodeEnd: (node) => `end:${node.type.name}`,
  encodeNodeStart: (node) =>
    `start:${node.type.name}:${stableValue(node.attrs)}`,
};

function createInlineCandidateWidget(
  document: ProseMirrorNode,
  from: number,
  to: number,
  className: string
) {
  const content = document.slice(from, to).content;
  if (content.size === 0) return null;

  const renderedContent = DOMSerializer.fromSchema(document.type.schema)
    .serializeFragment(content)
    .cloneNode(true) as DocumentFragment;

  return () => {
    const widget = window.document.createElement('span');
    widget.className = className;
    widget.contentEditable = 'false';
    widget.append(renderedContent.cloneNode(true));
    return widget;
  };
}

function createBlockCandidateWidget(
  document: ProseMirrorNode,
  from: number,
  to: number,
  className: string
) {
  const content = document.slice(from, to).content;
  if (content.size === 0) return null;

  const renderedContent = DOMSerializer.fromSchema(document.type.schema)
    .serializeFragment(content)
    .cloneNode(true) as DocumentFragment;
  const parent = document.resolve(from).parent;
  const tagName =
    parent.type.name === 'orderedList'
      ? 'ol'
      : parent.type.name === 'bulletList' || parent.type.name === 'taskList'
        ? 'ul'
        : 'div';

  return () => {
    const widget = window.document.createElement(tagName);
    widget.className = className;
    widget.contentEditable = 'false';
    if (parent.type.name === 'orderedList' && parent.attrs.start !== 1) {
      widget.setAttribute('start', String(parent.attrs.start));
    }
    if (parent.type.name === 'taskList') {
      widget.dataset.type = 'taskList';
    }
    widget.append(renderedContent.cloneNode(true));
    return widget;
  };
}

function hasOnlyInlineContent(
  document: ProseMirrorNode,
  from: number,
  to: number
) {
  let isInline = true;
  document.slice(from, to).content.forEach((node) => {
    if (!node.isInline) isInline = false;
  });
  return isInline;
}

function isInlineChange(
  proposal: LessonAiProposal,
  candidate: Transaction,
  fromA: number,
  toA: number,
  fromB: number,
  toB: number
) {
  if (!proposal.document.resolve(fromA).parent.isTextblock) return false;

  return (
    hasOnlyInlineContent(proposal.document, fromA, toA) &&
    hasOnlyInlineContent(candidate.doc, fromB, toB)
  );
}

function createReviewDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const changes = ChangeSet.create(
    proposal.document,
    undefined,
    reviewTokenEncoder
  ).addSteps(candidate.doc, candidate.mapping.maps, null).changes;
  const decorations: Decoration[] = [];
  const usesBlockPreview = changes.some(
    (change) =>
      !isInlineChange(
        proposal,
        candidate,
        change.fromA,
        change.toA,
        change.fromB,
        change.toB
      )
  );

  if (usesBlockPreview) {
    decorations.push(
      ...proposal.blocks.map((block) =>
        Decoration.node(block.from, block.to, {
          class: 'lesson-ai-review-original-block',
        })
      )
    );

    const widget = createBlockCandidateWidget(
      candidate.doc,
      candidate.mapping.map(proposal.from, -1),
      candidate.mapping.map(proposal.to, 1),
      'lesson-ai-review-inserted lesson-ai-review-inserted-block'
    );

    if (widget) {
      decorations.push(
        Decoration.widget(proposal.previewAnchor, widget, {
          ignoreSelection: true,
          key: 'lesson-ai-review-inserted-block',
          side: 1,
          stopEvent: () => true,
        })
      );
    }
  } else {
    for (const change of changes) {
      if (change.toA > change.fromA) {
        decorations.push(
          Decoration.inline(change.fromA, change.toA, {
            class: 'lesson-ai-review-deleted',
          })
        );
      }

      if (change.toB > change.fromB) {
        const insertionAnchor = change.toA;
        const widget = createInlineCandidateWidget(
          candidate.doc,
          change.fromB,
          change.toB,
          'lesson-ai-review-inserted'
        );
        if (widget) {
          decorations.push(
            Decoration.widget(insertionAnchor, widget, {
              ignoreSelection: true,
              key: `lesson-ai-review-inserted-${change.fromA}-${change.toA}`,
              side: 1,
              stopEvent: () => true,
            })
          );
        }
      }
    }
  }

  return decorations;
}

function createReviewDecorationSet(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const decorationSet = DecorationSet.create(
    proposal.document,
    createReviewDecorations(proposal, candidate)
  );

  if (decorationSet.find().length === 0) {
    throw new LessonAiReviewError('unableToPreview');
  }

  return decorationSet;
}

export const LessonAiReview = Extension.create({
  name: 'lessonAiReview',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: lessonAiReviewPluginKey,
        props: {
          decorations(state) {
            return lessonAiReviewPluginKey.getState(state);
          },
        },
        state: {
          apply(transaction, decorationSet) {
            const meta = transaction.getMeta(lessonAiReviewPluginKey) as
              | LessonAiReviewMeta
              | undefined;

            if (meta?.type === 'set') return meta.decorations;
            if (meta?.type === 'clear' || transaction.docChanged) {
              return DecorationSet.empty;
            }

            return decorationSet.map(transaction.mapping, transaction.doc);
          },
          init: () => DecorationSet.empty,
        },
      }),
    ];
  },
});

export function showLessonAiReview(
  editor: Editor,
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  if (!editor.state.doc.eq(proposal.document)) {
    throw new Error(
      'The lesson changed while AI was responding. Please try again.'
    );
  }

  if (candidate.doc.eq(proposal.document)) {
    throw new LessonAiReviewError('noChanges');
  }

  const decorations = createReviewDecorationSet(proposal, candidate);
  editor.view.dom.classList.add(lessonAiReviewActiveClass);
  editor.view.dispatch(
    editor.state.tr.setMeta(lessonAiReviewPluginKey, {
      decorations,
      type: 'set',
    } satisfies LessonAiReviewMeta)
  );
}

export function clearLessonAiReview(editor: Editor) {
  editor.view.dom.classList.remove(lessonAiReviewActiveClass);
  editor.view.dispatch(
    editor.state.tr.setMeta(lessonAiReviewPluginKey, {
      type: 'clear',
    } satisfies LessonAiReviewMeta)
  );
}

export function clearLessonAiReviewTransaction(
  editor: Editor,
  transaction: Transaction
) {
  editor.view.dom.classList.remove(lessonAiReviewActiveClass);

  return transaction.setMeta(lessonAiReviewPluginKey, {
    type: 'clear',
  } satisfies LessonAiReviewMeta);
}
