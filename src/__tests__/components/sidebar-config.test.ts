import { describe, expect, it } from 'vitest';
import {
  filterAdminNavItems,
  filterCourseNavItems,
  getAdminNavItems,
  getAssistantNavItems,
  getCourseNavItems,
  getSettingNavItems,
} from '@/components/layout/sidebar-config';
import {
  COURSE_PERMISSION,
  PLATFORM_PERMISSION,
} from '@/lib/permissions/permission-keys';

const t = (key: string) => key;

describe('sidebar-config', () => {
  it('uses a matcher function for assistant nav items', () => {
    const [homeItem, inventoryItem] = getAssistantNavItems(t as never);

    expect(homeItem.isActive('/')).toBe(true);
    expect(homeItem.isActive('/inventory')).toBe(false);
    expect(inventoryItem.isActive('/inventory')).toBe(true);
    expect(inventoryItem.isActive('/inventory/books')).toBe(true);
  });

  it('keeps settings root item inactive on child routes', () => {
    const settingsItems = getSettingNavItems(t as never);

    expect(settingsItems[2].isActive('/settings')).toBe(true);
    expect(settingsItems[2].isActive('/settings/ai-preferences')).toBe(false);
  });

  it('supports course items that only match the course root route', () => {
    const courseItems = getCourseNavItems('course-123');

    expect(courseItems[0].isActive('/courses/course-123')).toBe(true);
    expect(courseItems[0].isActive('/courses/course-123/chat')).toBe(false);
  });

  it('filters course items by the current course permissions', () => {
    const courseItems = getCourseNavItems('course-123');

    const filteredItems = filterCourseNavItems(courseItems, [
      COURSE_PERMISSION.COURSE_CONTENT_VIEW,
    ]);

    expect(filteredItems.map((item) => item.url)).toEqual([
      '/courses/course-123',
    ]);
  });

  it('requires both assessment authoring permissions for the question bank', () => {
    const questionBank = getCourseNavItems('course-123').find((item) =>
      item.url.endsWith('/question-bank')
    );

    expect(
      filterCourseNavItems(
        [questionBank!],
        [COURSE_PERMISSION.ASSESSMENTS_CREATE]
      )
    ).toEqual([]);
    expect(
      filterCourseNavItems(
        [questionBank!],
        [
          COURSE_PERMISSION.ASSESSMENTS_CREATE,
          COURSE_PERMISSION.ASSESSMENTS_UPDATE,
          COURSE_PERMISSION.ASSESSMENTS_DELETE,
        ]
      )
    ).toEqual([questionBank]);
  });

  it('filters admin nav items by view or manage platform permissions', () => {
    const adminItems = getAdminNavItems(t as never);
    const filteredItems = filterAdminNavItems(adminItems, [
      PLATFORM_PERMISSION.ROLES_VIEW,
      PLATFORM_PERMISSION.ROLES_MANAGE,
    ]);

    expect(filteredItems.map((item) => item.url)).toEqual(['/admin/roles']);
  });
});
