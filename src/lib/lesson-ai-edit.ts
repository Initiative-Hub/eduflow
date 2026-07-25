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
  document: ProseMirrorNode;
  from: number;
  previewAnchor: number;
  to: number;
};

export type LessonAiEditRequest = {
  html: string;
  instruction: string;
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

type TextSegment = {
  from: number;
  text: string;
  to: number;
};

function createFragmentWrapper(editor: Editor, from: number, to: number) {
  const wrapper = window.document.createElement('div');
  const fragment = editor.state.doc.slice(from, to).content;

  wrapper.append(
    DOMSerializer.fromSchema(editor.schema).serializeFragment(fragment)
  );
  return wrapper;
}

function getTextSegments(document: ProseMirrorNode, from: number, to: number) {
  const segments: TextSegment[] = [];

  document.nodesBetween(from, to, (node, position) => {
    if (!node.isText || !node.text) return;

    const segmentFrom = Math.max(position, from);
    const segmentTo = Math.min(position + node.nodeSize, to);
    if (segmentFrom >= segmentTo) return;

    const offset = segmentFrom - position;
    segments.push({
      from: segmentFrom,
      text: node.text.slice(offset, offset + segmentTo - segmentFrom),
      to: segmentTo,
    });
  });

  return segments;
}

function appendMarkedText(
  fragment: DocumentFragment,
  text: string,
  from: number,
  to: number,
  selectionFrom: number,
  selectionTo: number
) {
  const selectedFrom = Math.max(from, selectionFrom);
  const selectedTo = Math.min(to, selectionTo);

  if (selectedFrom >= selectedTo) {
    fragment.append(text);
    return;
  }

  const startOffset = selectedFrom - from;
  const endOffset = selectedTo - from;
  if (startOffset > 0) fragment.append(text.slice(0, startOffset));

  const marker = window.document.createElement('selection');
  marker.textContent = text.slice(startOffset, endOffset);
  fragment.append(marker);

  if (endOffset < text.length) fragment.append(text.slice(endOffset));
}

function addSelectionMarkersToText(
  wrapper: HTMLDivElement,
  textSegments: TextSegment[],
  selectionFrom: number,
  selectionTo: number
) {
  const textNodes: Text[] = [];
  const walker = window.document.createTreeWalker(
    wrapper,
    window.NodeFilter.SHOW_TEXT
  );
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  let segmentIndex = 0;
  let segmentOffset = 0;

  for (const textNode of textNodes) {
    const text = textNode.data;
    const replacement = window.document.createDocumentFragment();
    let textOffset = 0;

    while (textOffset < text.length) {
      const segment = textSegments[segmentIndex];
      if (!segment) {
        throw new Error('Unable to mark the selected lesson content.');
      }

      const remainingSegmentLength = segment.text.length - segmentOffset;
      const length = Math.min(text.length - textOffset, remainingSegmentLength);
      const part = text.slice(textOffset, textOffset + length);
      const expected = segment.text.slice(
        segmentOffset,
        segmentOffset + length
      );

      if (part !== expected) {
        throw new Error('Unable to mark the selected lesson content.');
      }

      const partFrom = segment.from + segmentOffset;
      appendMarkedText(
        replacement,
        part,
        partFrom,
        partFrom + length,
        selectionFrom,
        selectionTo
      );

      textOffset += length;
      segmentOffset += length;
      if (segmentOffset === segment.text.length) {
        segmentIndex += 1;
        segmentOffset = 0;
      }
    }

    textNode.replaceWith(replacement);
  }

  if (segmentIndex !== textSegments.length || segmentOffset !== 0) {
    throw new Error('Unable to mark the selected lesson content.');
  }
}

function fragmentToMarkedHtml(editor: Editor, from: number, to: number) {
  const { doc, selection } = editor.state;
  const wrapper = createFragmentWrapper(editor, from, to);

  if (selection instanceof NodeSelection) {
    const node = wrapper.firstChild;
    if (!node || wrapper.childNodes.length !== 1) {
      throw new Error('Unable to mark the selected lesson content.');
    }

    const marker = window.document.createElement('selection');
    marker.append(node);
    wrapper.append(marker);
    return wrapper.innerHTML;
  }

  addSelectionMarkersToText(
    wrapper,
    getTextSegments(doc, from, to),
    selection.from,
    selection.to
  );

  if (!wrapper.querySelector('selection')) {
    throw new Error('Unable to mark the selected lesson content.');
  }

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
    return {
      blocks: [{ from: listItem.from, to: listItem.to }],
      from: listItem.from,
      previewAnchor: $from.after(listItem.parentDepth),
      to: listItem.to,
    };
  }

  const fromUnit = getNearestBlockUnit($from);
  const toUnit = getNearestBlockUnit($to);
  const containerDepth = Math.min(
    getSharedAncestorDepth($from, $to),
    fromUnit.parentDepth,
    toUnit.parentDepth
  );
  const blocks = getSiblingBlockRanges($from, $to, containerDepth);

  return {
    blocks,
    from: blocks[0].from,
    previewAnchor: getPreviewAnchor(
      $from,
      containerDepth,
      blocks[blocks.length - 1].to
    ),
    to: blocks[blocks.length - 1].to,
  };
}

function createLessonAiProposal(editor: Editor): LessonAiProposal {
  const expandedSelection = getExpandedBlockSelection(editor);
  if (!expandedSelection) {
    throw new Error('Select part of the lesson before asking AI to edit it.');
  }

  const { blocks, from, previewAnchor, to } = expandedSelection;

  return {
    blocks,
    document: editor.state.doc,
    from,
    previewAnchor,
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
      html: fragmentToMarkedHtml(editor, proposal.from, proposal.to),
      instruction,
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

function unwrapSelectionMarkers(html: string) {
  const document = new window.DOMParser().parseFromString(html, 'text/html');

  for (const marker of Array.from(document.querySelectorAll('selection'))) {
    marker.replaceWith(...Array.from(marker.childNodes));
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
  container.innerHTML = sanitizeLessonAiHtml(unwrapSelectionMarkers(html));

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
