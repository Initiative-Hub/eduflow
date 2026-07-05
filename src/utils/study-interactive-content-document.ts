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
 * This is defense-in-depth. The iframe must still use a restrictive sandbox
 * such as `sandbox="allow-scripts"` without `allow-same-origin`.
 */
export function createSecureInteractiveContentDocument(html: string): string {
  const cleanedHtml = html
    .trim()
    .replace(/^```html\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(
      /<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
      ''
    )
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<link\b[^>]*\/?>/gi, '');

  if (/<head\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<head\b([^>]*)>/i, `<head$1>${SECURITY_META}`);
  }

  if (/<html\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(
      /<html\b([^>]*)>/i,
      `<html$1><head>${SECURITY_META}</head>`
    );
  }

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

export function createInteractiveContentDownloadFilename(
  title: string
): string {
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
  return new File([html], createInteractiveContentDownloadFilename(title), {
    type: 'text/html;charset=utf-8',
  });
}
