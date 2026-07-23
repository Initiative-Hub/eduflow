'use client';

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  DOMSerializer,
  DOMParser as ProseMirrorDOMParser,
  type ResolvedPos,
  Slice,
} from '@tiptap/pm/model';
import { NodeSelection, type Transaction } from '@tiptap/pm/state';

const MAX_EDITED_HTML_LENGTH = 40_000;

export type LessonAiProposal = {
  blocks: LessonAiBlockRange[];
  beforeText: string;
  document: ProseMirrorNode;
  from: number;
  html: string;
  previewAnchor: number;
  selectionText: string;
  to: number;
};

export type LessonAiEditRequest = {
  beforeText: string;
  html: string;
  instruction: string;
  selectionText: string;
};

export type PreparedLessonAiEdit = {
  proposal: LessonAiProposal;
  request: LessonAiEditRequest;
};

export type LessonAiBlockRange = {
  from: number;
  to: number;
};

export type ExpandedBlockSelection = {
  blocks: LessonAiBlockRange[];
  from: number;
  previewAnchor: number;
  to: number;
};

function fragmentToHtml(editor: Editor, from: number, to: number) {
  const wrapper = window.document.createElement('div');
  const fragment = editor.state.doc.slice(from, to).content;

  wrapper.append(
    DOMSerializer.fromSchema(editor.schema).serializeFragment(fragment)
  );
  return wrapper.innerHTML;
}

type BlockUnit = LessonAiBlockRange & {
  parentDepth: number;
};

const LIST_ITEM_TYPES = new Set(['listItem', 'taskItem']);
const PREVIEW_CONTAINER_TYPES = new Set([
  'blockquote',
  'bulletList',
  'orderedList',
  'taskList',
]);

function getNodeRange($pos: ResolvedPos, depth: number): BlockUnit {
  const node = $pos.node(depth);
  const from = $pos.before(depth);

  return {
    from,
    parentDepth: depth - 1,
    to: from + node.nodeSize,
  };
}

function findAncestorDepth(
  $pos: ResolvedPos,
  matches: (node: ProseMirrorNode) => boolean
) {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (matches($pos.node(depth))) return depth;
  }

  return null;
}

function getNearestBlockUnit($pos: ResolvedPos): BlockUnit {
  const listItemDepth = findAncestorDepth($pos, (node) =>
    LIST_ITEM_TYPES.has(node.type.name)
  );
  const blockDepth =
    listItemDepth ??
    findAncestorDepth(
      $pos,
      (node) => node.isTextblock || (node.isBlock && node.isAtom)
    );

  if (blockDepth !== null) return getNodeRange($pos, blockDepth);

  throw new Error('Select a lesson block before asking AI to edit it.');
}

function getSharedAncestorDepth(
  $from: ResolvedPos,
  $to: ResolvedPos,
  matches: (node: ProseMirrorNode) => boolean = () => true
) {
  const maxDepth = Math.min($from.depth, $to.depth);

  for (let depth = maxDepth; depth > 0; depth -= 1) {
    if ($from.start(depth) === $to.start(depth) && matches($from.node(depth))) {
      return depth;
    }
  }

  return 0;
}

function getSiblingBlockRanges(
  $from: ResolvedPos,
  $to: ResolvedPos,
  containerDepth: number
) {
  const container = $from.node(containerDepth);
  const fromIndex = $from.index(containerDepth);
  const toIndex = $to.index(containerDepth);
  const containerStart = containerDepth === 0 ? 0 : $from.start(containerDepth);
  const blocks: LessonAiBlockRange[] = [];

  container.forEach((node, offset, index) => {
    if (index < fromIndex || index > toIndex) return;

    const from = containerStart + offset;
    blocks.push({ from, to: from + node.nodeSize });
  });

  if (blocks.length === 0) {
    throw new Error('Select a lesson block before asking AI to edit it.');
  }

  return blocks;
}

function getPreviewAnchor(
  $from: ResolvedPos,
  containerDepth: number,
  fallback: number
) {
  if (
    containerDepth > 0 &&
    PREVIEW_CONTAINER_TYPES.has($from.node(containerDepth).type.name)
  ) {
    return $from.after(containerDepth);
  }

  return fallback;
}

function createExpandedSelection(
  blocks: LessonAiBlockRange[],
  previewAnchor: number
): ExpandedBlockSelection {
  return {
    blocks,
    from: blocks[0].from,
    previewAnchor,
    to: blocks[blocks.length - 1].to,
  };
}

export function getExpandedBlockSelection(
  editor: Editor
): ExpandedBlockSelection | null {
  const { doc, selection } = editor.state;
  if (selection.empty) return null;

  if (selection instanceof NodeSelection) {
    return {
      blocks: [{ from: selection.from, to: selection.to }],
      from: selection.from,
      previewAnchor: selection.to,
      to: selection.to,
    };
  }

  const $from = doc.resolve(selection.from);
  const $to = doc.resolve(selection.to - 1);
  const sharedListItemDepth = getSharedAncestorDepth($from, $to, (node) =>
    LIST_ITEM_TYPES.has(node.type.name)
  );

  if (sharedListItemDepth) {
    const listItem = getNodeRange($from, sharedListItemDepth);
    return createExpandedSelection(
      [{ from: listItem.from, to: listItem.to }],
      $from.after(listItem.parentDepth)
    );
  }

  const fromUnit = getNearestBlockUnit($from);
  const toUnit = getNearestBlockUnit($to);
  const containerDepth = Math.min(
    getSharedAncestorDepth($from, $to),
    fromUnit.parentDepth,
    toUnit.parentDepth
  );
  const blocks = getSiblingBlockRanges($from, $to, containerDepth);

  return createExpandedSelection(
    blocks,
    getPreviewAnchor($from, containerDepth, blocks[blocks.length - 1].to)
  );
}

function getSelectionText(editor: Editor) {
  const { doc, selection } = editor.state;
  const selectionText = doc.textBetween(selection.from, selection.to, ' ');

  if (selectionText.trim()) return selectionText;
  if (selection instanceof NodeSelection)
    return `[${selection.node.type.name}]`;

  return '[selected content]';
}

function createLessonAiProposal(editor: Editor): LessonAiProposal {
  const expandedSelection = getExpandedBlockSelection(editor);
  if (!expandedSelection) {
    throw new Error('Select part of the lesson before asking AI to edit it.');
  }

  const { blocks, from, previewAnchor, to } = expandedSelection;

  return {
    blocks,
    beforeText: editor.state.doc.textBetween(from, to, ' '),
    document: editor.state.doc,
    from,
    html: fragmentToHtml(editor, from, to),
    previewAnchor,
    selectionText: getSelectionText(editor),
    to,
  };
}

export function prepareAiEdit(
  editor: Editor,
  instruction: string
): PreparedLessonAiEdit {
  const proposal = createLessonAiProposal(editor);

  return {
    proposal,
    request: {
      beforeText: proposal.beforeText,
      html: proposal.html,
      instruction,
      selectionText: proposal.selectionText,
    },
  };
}

function isSafeUrl(value: string, tagName: string) {
  try {
    const url = new URL(value, window.location.origin);

    if (tagName === 'iframe') {
      return url.protocol === 'https:' && url.hostname.endsWith('youtube.com');
    }

    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeStyle(style: string) {
  const allowed = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => declaration.split(':').map((part) => part.trim()))
    .filter(([property, value]) => {
      if (!property || !value) return false;
      if (property === 'text-align') {
        return ['left', 'center', 'right', 'justify'].includes(value);
      }
      return property === 'background-color' && /^[-#(),.%\w\s]+$/i.test(value);
    })
    .map(([property, value]) => `${property}: ${value}`);

  return allowed.join('; ');
}

export function sanitizeLessonAiHtml(html: string) {
  if (html.length > MAX_EDITED_HTML_LENGTH) {
    throw new Error('The AI response is too large to apply safely.');
  }

  const document = new window.DOMParser().parseFromString(html, 'text/html');
  const allowedTags = new Set([
    'a',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'iframe',
    'img',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    's',
    'span',
    'strong',
    'sub',
    'sup',
    'u',
    'ul',
  ]);
  const removeWithContent = new Set([
    'base',
    'embed',
    'link',
    'object',
    'script',
    'style',
  ]);
  const allowedAttributes = new Set([
    'alt',
    'data-checked',
    'data-color',
    'data-type',
    'data-youtube-video',
    'height',
    'href',
    'rel',
    'src',
    'start',
    'style',
    'target',
    'title',
    'type',
    'width',
  ]);

  for (const element of Array.from(
    document.body.querySelectorAll('*')
  ).reverse()) {
    const tagName = element.tagName.toLowerCase();

    if (!allowedTags.has(tagName)) {
      if (removeWithContent.has(tagName)) {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();

      if (!allowedAttributes.has(name) || name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === 'style') {
        const safeStyle = sanitizeStyle(attribute.value);
        if (safeStyle) element.setAttribute('style', safeStyle);
        else element.removeAttribute('style');
      }

      if (
        (name === 'href' || name === 'src') &&
        !isSafeUrl(attribute.value, tagName)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return document.body.innerHTML;
}

export function resolveAiEdit(
  editor: Editor,
  proposal: LessonAiProposal,
  html: string
): Transaction {
  if (!editor.state.doc.eq(proposal.document)) {
    throw new Error(
      'The lesson changed while AI was responding. Please try again.'
    );
  }

  const container = window.document.createElement('div');
  container.innerHTML = sanitizeLessonAiHtml(html);

  const parsed = ProseMirrorDOMParser.fromSchema(editor.schema).parseSlice(
    container,
    { preserveWhitespace: 'full' }
  );
  const transaction = editor.state.tr.replace(
    proposal.from,
    proposal.to,
    new Slice(parsed.content, 0, 0)
  );

  transaction.doc.check();
  return transaction;
}
