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

function blockShape(node: ProseMirrorNode): string {
  if (node.isText) return '';

  const children: string[] = [];
  node.forEach((child) => {
    const shape = blockShape(child);
    if (shape) children.push(shape);
  });

  return `${node.type.name}:${JSON.stringify(node.attrs)}[${children.join(',')}]`;
}

function hasStructuralChange(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const candidateFrom = candidate.mapping.map(proposal.from, -1);
  const candidateTo = candidate.mapping.map(proposal.to, 1);
  const original = proposal.document.cut(proposal.from, proposal.to);
  const replacement = candidate.doc.cut(candidateFrom, candidateTo);

  return blockShape(original) !== blockShape(replacement);
}

function getCandidateRange(proposal: LessonAiProposal, candidate: Transaction) {
  return {
    from: candidate.mapping.map(proposal.from, -1),
    to: candidate.mapping.map(proposal.to, 1),
  };
}

function createCandidateWidget(
  document: ProseMirrorNode,
  from: number,
  to: number,
  className: string,
  tagName: 'div' | 'span'
) {
  const content = document.slice(from, to).content;
  if (content.size === 0) return null;

  const renderedContent = DOMSerializer.fromSchema(document.type.schema)
    .serializeFragment(content)
    .cloneNode(true) as DocumentFragment;

  return () => {
    const widget = window.document.createElement(tagName);
    widget.className = className;
    widget.contentEditable = 'false';
    widget.append(renderedContent.cloneNode(true));
    return widget;
  };
}

function createInlineDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const changes = ChangeSet.create(
    proposal.document,
    undefined,
    reviewTokenEncoder
  ).addSteps(candidate.doc, candidate.mapping.maps, null).changes;
  const decorations: Decoration[] = [];

  for (const change of changes) {
    if (change.toA > change.fromA) {
      decorations.push(
        Decoration.inline(change.fromA, change.toA, {
          class: 'lesson-ai-review-deleted',
        })
      );
    }

    if (change.toB > change.fromB) {
      const widget = createCandidateWidget(
        candidate.doc,
        change.fromB,
        change.toB,
        'lesson-ai-review-inserted',
        'span'
      );
      if (widget) {
        decorations.push(
          Decoration.widget(
            candidate.mapping.invert().map(change.fromB, -1),
            widget,
            {
              ignoreSelection: true,
              key: `lesson-ai-review-inserted-${change.fromA}-${change.toA}`,
              side: -1,
              stopEvent: () => true,
            }
          )
        );
      }
    }
  }

  return decorations;
}

function createStructuralDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const decorations: Decoration[] = proposal.blocks.map((block) =>
    Decoration.node(block.from, block.to, {
      class: 'lesson-ai-review-original-block',
    })
  );
  const { from, to } = getCandidateRange(proposal, candidate);
  const widget = createCandidateWidget(
    candidate.doc,
    from,
    to,
    'lesson-ai-review-inserted lesson-ai-review-inserted-block',
    'div'
  );

  if (widget) {
    decorations.push(
      Decoration.widget(proposal.previewAnchor, widget, {
        ignoreSelection: true,
        key: 'lesson-ai-review-structural-inserted',
        side: -1,
        stopEvent: () => true,
      })
    );
  }

  return decorations;
}

function createReviewDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const decorations = hasStructuralChange(proposal, candidate)
    ? createStructuralDecorations(proposal, candidate)
    : createInlineDecorations(proposal, candidate);
  const decorationSet = DecorationSet.create(proposal.document, decorations);

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

  const decorations = createReviewDecorations(proposal, candidate);
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
