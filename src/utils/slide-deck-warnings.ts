/**
 * Deck generation reports three kinds of warning. Only some are worth putting in
 * front of a teacher.
 *
 * `dropped bindings` fires whenever a supplied key has no matching slot. The
 * binding flattener deliberately emits many alias spellings of the same value
 * (`bullets`, `bullets.1`, `bullet_1`, `heading.2`) so that one of them matches
 * whatever a template happens to call its slot; the unused spellings are then all
 * reported. With a sparse brand template that means a warning per slide even when
 * every slide rendered correctly, so it is logged but not surfaced.
 *
 * A skipped slide or a failed image, by contrast, always means visible damage.
 */
const NOISY_WARNING_PATTERN = /dropped bindings/i;

export function getCriticalDeckWarnings(
  warnings: readonly string[] | undefined
): string[] {
  if (!warnings?.length) return [];
  return warnings.filter((warning) => !NOISY_WARNING_PATTERN.test(warning));
}
