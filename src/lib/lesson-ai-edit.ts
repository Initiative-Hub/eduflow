'use client';

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  DOMSerializer,
  DOMParser as ProseMirrorDOMParser,
} from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

const MAX_EDITED_HTML_LENGTH = 40_000;

export type LessonAiProposal = {
  beforeText: string;
  document: ProseMirrorNode;
  from: number;
  html: string;
  selectionText: string;
  to: number;
};

function fragmentToHtml(editor: Editor, from: number, to: number) {
  const wrapper = window.document.createElement('div');
  const fragment = editor.state.doc.cut(from, to).content;

  wrapper.append(
    DOMSerializer.fromSchema(editor.schema).serializeFragment(fragment)
  );
  return wrapper.innerHTML;
}

function getEnvelopeRange(editor: Editor) {
  const { doc, selection } = editor.state;
  let from = -1;
  let to = -1;

  doc.forEach((node, offset) => {
    const nodeEnd = offset + node.nodeSize;

    if (nodeEnd <= selection.from || offset >= selection.to) return;
    if (from === -1) from = offset;
    to = nodeEnd;
  });

  if (from === -1 || to === -1) {
    throw new Error('Select part of the lesson before asking AI to edit it.');
  }

  return { from, to };
}

export function createLessonAiProposal(editor: Editor): LessonAiProposal {
  if (editor.state.selection.empty) {
    throw new Error('Select part of the lesson before asking AI to edit it.');
  }

  const { from, to } = getEnvelopeRange(editor);

  return {
    beforeText: editor.state.doc.textBetween(from, to, ' '),
    document: editor.state.doc,
    from,
    html: fragmentToHtml(editor, from, to),
    selectionText: editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    ),
    to,
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

export function createLessonAiTransaction(
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

  const parsed = ProseMirrorDOMParser.fromSchema(editor.schema).parse(
    container,
    {
      preserveWhitespace: 'full',
    }
  );
  const transaction = editor.state.tr.replaceWith(
    proposal.from,
    proposal.to,
    parsed.content
  );

  transaction.doc.check();
  return transaction;
}
