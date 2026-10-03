import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  POST as coursePOST,
  maxDuration as courseDuration,
} from '@/app/api/v1/courses/[courseId]/storage/import/onedrive/route';
import {
  POST as personalPOST,
  maxDuration as personalDuration,
} from '@/app/api/v1/storage/import/onedrive/route';
import { CourseService } from '@/services/CourseService';
import { OneDriveImportService } from '@/services/onedrive/OneDriveImportService';

vi.mock('@/lib/api/middlewares', () => {
  const withAuth =
    (handler: (...args: any[]) => unknown) =>
    (req: Request, ...args: unknown[]) =>
      handler(req, { user: { id: 'user-1' } }, ...args);
  return {
    withAuth,
    withPermissions: (
      _permissions: string[],
      handler: (...args: any[]) => unknown
    ) => withAuth(handler),
  };
});
vi.mock('@/services/CourseService', () => ({
  CourseService: { isMember: vi.fn() },
}));
vi.mock('@/services/onedrive/OneDriveImportService', () => ({
  OneDriveImportService: { importFile: vi.fn() },
}));

const context = {
  params: Promise.resolve({ courseId: '2b25a6da-09bc-4783-8a0d-60811389d612' }),
};

describe('OneDrive import routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CourseService.isMember).mockResolvedValue(true);
    vi.mocked(OneDriveImportService.importFile).mockResolvedValue({
      id: 'file-1',
    } as any);
  });

  for (const [name, handler] of [
    ['personal', personalPOST],
    ['course', coursePOST],
  ] as const) {
    it.each(['{', '{}', 'null'])(
      `${name} rejects malformed or invalid JSON before importing: %s`,
      async (body) => {
        const response = await handler(
          new Request('https://eduflow.test/import', { method: 'POST', body }),
          context
        );
        expect(response.status).toBe(400);
        expect(OneDriveImportService.importFile).not.toHaveBeenCalled();
        expect(CourseService.isMember).not.toHaveBeenCalled();
      }
    );

    it(`${name} imports a validated item`, async () => {
      const response = await handler(
        new Request('https://eduflow.test/import', {
          method: 'POST',
          body: JSON.stringify({ driveId: 'drive-1', itemId: 'item-1' }),
        }),
        context
      );
      expect(response.status).toBe(201);
      expect(OneDriveImportService.importFile).toHaveBeenCalledWith(
        expect.objectContaining({
          driveId: 'drive-1',
          itemId: 'item-1',
          parentId: null,
          userId: 'user-1',
        })
      );
    });
  }

  it('rejects invalid course IDs and nonmembers before importing', async () => {
    const request = () =>
      new Request('https://eduflow.test/import', {
        method: 'POST',
        body: JSON.stringify({ driveId: 'drive-1', itemId: 'item-1' }),
      });
    expect(
      (
        await coursePOST(request(), {
          params: Promise.resolve({ courseId: 'bad' }),
        })
      ).status
    ).toBe(400);
    vi.mocked(CourseService.isMember).mockResolvedValue(false);
    expect((await coursePOST(request(), context)).status).toBe(403);
    expect(OneDriveImportService.importFile).not.toHaveBeenCalled();
  });

  it('allows five minutes for both server-side transfers', () => {
    expect(personalDuration).toBe(300);
    expect(courseDuration).toBe(300);
  });
});
