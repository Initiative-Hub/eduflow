'use client';

import { Download, Maximize2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import type { StudyInteractiveContentData } from '@/utils/study-interactive-content';

const SANDBOX_CSP = [
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

const SECURITY_META = `<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">`;

/**
 * Prepares AI-generated HTML for rendering inside EduFlow's sandboxed iframe.
 *
 * This function:
 * 1. Removes unsupported or potentially dangerous document elements.
 * 2. Replaces any model-generated CSP with EduFlow's trusted CSP.
 * 3. Injects the trusted CSP into the document.
 * 4. Wraps partial HTML in a complete HTML document when necessary.
 *
 * Important: This is defense-in-depth. The iframe must still use a restrictive
 * sandbox such as `sandbox="allow-scripts"` without `allow-same-origin`.
 */
function createSecureDocument(html: string): string {
  // Clean the raw input (remove markdown code fences if present)
  const cleanedHtml = html
    // Models occasionally wrap generated HTML in Markdown code fences.
    // Remove the fences because srcDoc expects raw HTML.
    .trim()
    .replace(/^```html\s*/i, '')
    .replace(/```\s*$/i, '')
    // Remove any CSP supplied by the generated document. Otherwise, generated
    // content could override or weaken EduFlow's security policy.
    .replace(
      /<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
      ''
    )
    // Remove <base> because it can change how every relative URL in the
    // generated document is resolved.
    .replace(/<base\b[^>]*>/gi, '')
    // Prevent generated content from embedding additional browsing contexts
    // or third-party pages.
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    // Prevent plugin-style embedded documents and resources.
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    // Prevent loading external stylesheets, icons, preloads, and other
    // resources through <link>.
    .replace(/<link\b[^>]*\/?>/gi, '');

  // If the generated content already has a <head>, inject EduFlow's CSP as
  // its first child. Existing metadata and styles remain intact.
  if (/<head\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<head\b([^>]*)>/i, `<head$1>${SECURITY_META}`);
  }

  // If there is an <html> element but no <head>, create a head containing
  // EduFlow's CSP immediately after the opening <html> tag.
  if (/<html\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(
      /<html\b([^>]*)>/i,
      `<html$1><head>${SECURITY_META}</head>`
    );
  }

  // The model may return an HTML fragment instead of a complete document.
  // Wrap that fragment so srcDoc receives a valid responsive HTML page.
  return `<!doctype html>
<html lang="en">
<head>
${SECURITY_META}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${cleanedHtml}
</body>
</html>`;
}

/**
 * Converts an activity title into a filesystem-friendly HTML filename.
 *
 * Example:
 * "Explore the Water Cycle!" -> "explore-the-water-cycle.html"
 */
function createDownloadFilename(title: string): string {
  const normalizedTitle = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  return `${normalizedTitle || 'interactive-study-activity'}.html`;
}

export function createInteractiveContentInventoryFile({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  return new File([html], createDownloadFilename(title), {
    type: 'text/html;charset=utf-8',
  });
}

const InteractiveContentPreview = ({
  title,
  description,
  html,
}: StudyInteractiveContentData) => {
  const t = useTranslations('StudyPage.features.interactiveContent');
  const containerRef = useRef<HTMLElement>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const secureDocument = useMemo(() => createSecureDocument(html), [html]);

  const handleReset = () => {
    setPreviewKey((currentKey) => currentKey + 1);
  };

  const handleFullscreen = () => {
    const container = containerRef.current;

    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    void container.requestFullscreen().catch(() => undefined);
  };

  const handleDownload = () => {
    const blob = new Blob([secureDocument], {
      type: 'text/html;charset=utf-8',
    });

    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = createDownloadFilename(title);
    anchor.click();

    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-col gap-4 border-border border-b p-4">
        <div className="w-full min-w-0">
          <h2 className="font-semibold text-foreground text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>

        <fieldset className="m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 p-0">
          <legend className="sr-only">{t('actionsLabel')}</legend>
          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleReset}
          >
            <RefreshCw className="size-4" />
            <span>{t('reset')}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleFullscreen}
          >
            <Maximize2 className="size-4" />
            <span>{t('fullscreen')}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-9 min-w-36 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleDownload}
          >
            <Download className="size-4" />
            <span>{t('download')}</span>
          </button>
        </fieldset>
      </header>
      <iframe
        key={previewKey}
        className="h-[clamp(45rem,85vh,60rem)] w-full bg-background"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts"
        srcDoc={secureDocument}
        title={t('previewTitle', { title })}
      />
    </section>
  );
};
export default InteractiveContentPreview;
