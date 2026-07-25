import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { ChangeSet } from '@tiptap/pm/changeset';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { LessonAiProposal } from '@/lib/lesson-ai-edit';

type LessonAiReviewMeta =
  | { decorations: DecorationSet; type: 'set' }
  | { type: 'clear' };

const lessonAiReviewPluginKey = new PluginKey<DecorationSet>('lessonAiReview');
const lessonAiReviewActiveClass = 'lesson-ai-review-active';

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

function createInsertedTextWidget(text: string) {
  return () => {
    const widget = document.createElement('span');
    widget.className = 'lesson-ai-review-inserted';
    widget.contentEditable = 'false';
    widget.textContent = text;
    return widget;
  };
}

function createInlineDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  const changes = ChangeSet.create(proposal.document).addSteps(
    candidate.doc,
    candidate.mapping.maps,
    null
  ).changes;
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
      const text = candidate.doc.textBetween(change.fromB, change.toB, ' ');
      if (text) {
        decorations.push(
          Decoration.widget(
            candidate.mapping.invert().map(change.fromB, -1),
            createInsertedTextWidget(text),
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

function getInlinePreviewPosition(proposal: LessonAiProposal) {
  let position = proposal.from;

  proposal.document.nodesBetween(proposal.from, proposal.to, (node, pos) => {
    if (position !== proposal.from) return false;
    if (!node.isTextblock) return;

    position = pos + 1;
    return false;
  });

  return position;
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
  const candidateFrom = candidate.mapping.map(proposal.from, -1);
  const candidateTo = candidate.mapping.map(proposal.to, 1);
  const text = candidate.doc.textBetween(candidateFrom, candidateTo, ' ');

  if (text) {
    decorations.push(
      Decoration.widget(
        getInlinePreviewPosition(proposal),
        createInsertedTextWidget(text),
        {
          ignoreSelection: true,
          key: 'lesson-ai-review-structural-inserted',
          side: -1,
          stopEvent: () => true,
        }
      )
    );
  }

  return decorations;
}

function createReviewDecorations(
  proposal: LessonAiProposal,
  candidate: Transaction
) {
  return DecorationSet.create(
    proposal.document,
    hasStructuralChange(proposal, candidate)
      ? createStructuralDecorations(proposal, candidate)
      : createInlineDecorations(proposal, candidate)
  );
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

  editor.view.dom.classList.add(lessonAiReviewActiveClass);
  editor.view.dispatch(
    editor.state.tr.setMeta(lessonAiReviewPluginKey, {
      decorations: createReviewDecorations(proposal, candidate),
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
