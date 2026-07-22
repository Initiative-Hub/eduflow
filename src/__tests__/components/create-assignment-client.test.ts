import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL(
    '../../app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/assignments/create/create-assignment-client.tsx',
    import.meta.url
  ),
  'utf8'
);

describe('CreateAssignmentClient layout', () => {
  it('contains the details, schedule, and settings sections', () => {
    expect(source).toContain("t('assignmentTitle')");
    expect(source).toContain("t('schedule')");
    expect(source).toContain("t('settings')");
  });

  it('keeps the editor inside the main content column', () => {
    expect(source).toContain('<AssignmentEditor');
    expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_20rem]');
  });
});
