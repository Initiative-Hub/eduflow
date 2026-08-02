import DOMPurify, {
  type UponSanitizeAttributeHook,
  type UponSanitizeAttributeHookEvent,
} from 'isomorphic-dompurify';

const MAX_EDITED_HTML_LENGTH = 40_000;

const STUDY_SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "child-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const STUDY_RESPONSIVE_GUARD_STYLE = `
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
  }

  body {
    box-sizing: border-box;
    overflow-wrap: break-word;
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
    min-width: 0;
  }

  img,
  svg,
  canvas,
  video,
  iframe {
    max-width: 100% !important;
  }

  pre,
  code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
`;

const LESSON_AI_ALLOWED_TAGS = [
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
];

const LESSON_AI_ALLOWED_ATTRIBUTES = [
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
];

const SVG_FORBIDDEN_TAGS = ['script', 'foreignObject', 'foreignobject'];
const STUDY_FORBIDDEN_TAGS = ['base', 'iframe', 'object', 'embed', 'link'];
const EXTERNAL_RESOURCE_ATTRIBUTES = new Set([
  'action',
  'formaction',
  'href',
  'poster',
  'src',
  'srcdoc',
  'srcset',
  'xlink:href',
]);

function isYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value, 'https://eduflow.local');
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol === 'https:' &&
      (hostname === 'youtube.com' || hostname.endsWith('.youtube.com'))
    );
  } catch {
    return false;
  }
}

function isLocalOrEmbeddedReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('#')) return true;

  try {
    const url = new URL(trimmed, 'https://eduflow.local');
    return (
      url.protocol === 'data:' ||
      url.protocol === 'blob:' ||
      url.origin === 'https://eduflow.local'
    );
  } catch {
    return false;
  }
}

function stripExternalCssReferences(css: string) {
  return css
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/url\(\s*(['"]?)(?!data:|blob:|#)[^)]+\1\s*\)/gi, 'none');
}

function stripMarkdownHtmlFence(html: string) {
  return html
    .trim()
    .replace(/^```html\s*/i, '')
    .replace(/```\s*$/i, '');
}

function withAttributeSanitizer<T>(
  hook: UponSanitizeAttributeHook,
  sanitize: () => T
) {
  DOMPurify.addHook('uponSanitizeAttribute', hook);

  try {
    return sanitize();
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute');
  }
}

function sanitizeStudyAttribute(
  node: Element,
  data: UponSanitizeAttributeHookEvent
) {
  const attrName = data.attrName.toLowerCase();
  const nodeName = node.nodeName.toLowerCase();

  if (nodeName === 'script' && attrName === 'src') {
    data.keepAttr = false;
    return;
  }

  if (
    EXTERNAL_RESOURCE_ATTRIBUTES.has(attrName) &&
    !isLocalOrEmbeddedReference(data.attrValue)
  ) {
    data.keepAttr = false;
  }
}

function sanitizeSvgAttribute(
  _node: Element,
  data: UponSanitizeAttributeHookEvent
) {
  const attrName = data.attrName.toLowerCase();

  if (
    EXTERNAL_RESOURCE_ATTRIBUTES.has(attrName) &&
    !isLocalOrEmbeddedReference(data.attrValue)
  ) {
    data.keepAttr = false;
  }
}

function sanitizeStyleElements(root: Element) {
  for (const styleElement of Array.from(root.querySelectorAll('style'))) {
    styleElement.textContent = stripExternalCssReferences(
      styleElement.textContent ?? ''
    );
  }

  for (const element of Array.from(root.querySelectorAll('[style]'))) {
    const styleValue = element.getAttribute('style');
    if (styleValue) {
      element.setAttribute('style', stripExternalCssReferences(styleValue));
    }
  }
}

function ensureHtmlDocument(root: Element) {
  const document = root.ownerDocument;

  let head = root.querySelector('head');
  if (!head) {
    head = document.createElement('head');
    root.prepend(head);
  }

  let body = root.querySelector('body');
  if (!body) {
    body = document.createElement('body');
    root.append(body);
  }

  return { body, document, head };
}

function prependStudyHeadInjection(head: Element) {
  for (const duplicate of Array.from(
    head.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"], style#eduflow-responsive-guard'
    )
  )) {
    duplicate.remove();
  }

  const document = head.ownerDocument;
  const viewportMeta = document.createElement('meta');
  viewportMeta.setAttribute('name', 'viewport');
  viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1');

  const charsetMeta = document.createElement('meta');
  charsetMeta.setAttribute('charset', 'utf-8');

  const cspMeta = document.createElement('meta');
  cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
  cspMeta.setAttribute('content', STUDY_SANDBOX_CSP);

  const responsiveGuard = document.createElement('style');
  responsiveGuard.id = 'eduflow-responsive-guard';
  responsiveGuard.textContent = STUDY_RESPONSIVE_GUARD_STYLE;

  head.prepend(cspMeta, responsiveGuard, charsetMeta, viewportMeta);
}

export function sanitizeLessonAiHtml(html: string) {
  if (html.length > MAX_EDITED_HTML_LENGTH) {
    throw new Error('The AI response is too large to apply safely.');
  }

  return withAttributeSanitizer(
    (node: any, data: any) => {
      if (
        node.nodeName.toLowerCase() === 'iframe' &&
        data.attrName === 'src' &&
        !isYouTubeEmbedUrl(data.attrValue)
      ) {
        data.keepAttr = false;
      }
    },
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_ATTR: LESSON_AI_ALLOWED_ATTRIBUTES,
        ALLOWED_TAGS: LESSON_AI_ALLOWED_TAGS,
        ALLOW_DATA_ATTR: false,
      })
  );
}

export function sanitizeInteractiveContentDocument(html: string) {
  const sanitizedRoot = withAttributeSanitizer(sanitizeStudyAttribute, () =>
    DOMPurify.sanitize(stripMarkdownHtmlFence(html), {
      ADD_TAGS: ['script'],
      FORBID_TAGS: STUDY_FORBIDDEN_TAGS,
      RETURN_DOM: true,
      WHOLE_DOCUMENT: true,
    })
  ) as Element;

  sanitizeStyleElements(sanitizedRoot);

  const { head } = ensureHtmlDocument(sanitizedRoot);
  prependStudyHeadInjection(head);

  if (!sanitizedRoot.getAttribute('lang')) {
    sanitizedRoot.setAttribute('lang', 'en');
  }

  return `<!doctype html>\n${sanitizedRoot.outerHTML}`;
}

export function sanitizeSvgMarkup(svgContent: string) {
  const fragment = withAttributeSanitizer(sanitizeSvgAttribute, () =>
    DOMPurify.sanitize(svgContent, {
      ADD_ATTR: ['viewBox', 'preserveAspectRatio', 'xmlns', 'xlink:href'],
      FORBID_TAGS: SVG_FORBIDDEN_TAGS,
      RETURN_DOM_FRAGMENT: true,
      USE_PROFILES: { svg: true, svgFilters: true },
    })
  ) as DocumentFragment;

  const svg = fragment.querySelector('svg');
  if (!svg) return '';

  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const existingStyle = svg.getAttribute('style')?.trim();
  const responsiveStyle =
    'display: block; width: 100%; height: 100%; object-fit: contain;';
  svg.setAttribute(
    'style',
    existingStyle ? `${existingStyle}; ${responsiveStyle}` : responsiveStyle
  );

  return svg.outerHTML;
}
