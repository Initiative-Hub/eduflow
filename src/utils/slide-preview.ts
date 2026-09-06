import { sanitizeSvgMarkup } from '@/lib/html-sanitizer';

/**
 * Utility to clean SVG slide template markup for responsive inline previews,
 * replacing template variable placeholders (e.g. {{title}}, {{heading}}) with
 * mock learning text values.
 */
export function getCleanedPreviewSvg(svgContent: string): string {
  let cleaned = svgContent;

  const replacements: Record<string, string> = {
    heading: 'Concept Introduction',
    title: 'Visual Learning Slide',
    subtitle: 'A beautiful presentation design for courses and slides.',
    presenter: 'Presented by EduFlow',
    kicker: 'CHAPTER 1',
    quote:
      '"Tell me and I forget. Teach me and I remember. Involve me and I learn."',
    footer_note: 'EduFlow Learning Platform • 2026',
    left_col_text:
      'Key details about the first concept side. Supports lists and highlights.',
    right_col_text:
      'Comparison points on the second concept side. Easily customizable.',
    body_text:
      'Foundational concepts explained using modern slide layout structures designed to keep students engaged.',
  };

  // Replace standard {{key|length}} and {{key}} placeholders
  cleaned = cleaned.replace(/\{\{([^}|]+)(?:\|[^}]+)?\}\}/g, (_match, p1) => {
    const key = p1.trim().toLowerCase();
    if (replacements[key]) return replacements[key];

    // Handle dynamic numbered items like title.1, items.1
    const baseKey = key.split('.')[0];
    if (replacements[baseKey]) return replacements[baseKey];

    if (
      key.includes('bullet') ||
      key.includes('item') ||
      key.includes('step') ||
      key.includes('summary')
    ) {
      return 'Engaging detail or concept bullet point';
    }
    if (key.includes('stat') || key.includes('kpi') || key.includes('value')) {
      return '92%';
    }
    if (key.includes('label')) {
      return 'Growth Rate';
    }

    return key.toUpperCase();
  });

  return sanitizeSvgMarkup(cleaned);
}
