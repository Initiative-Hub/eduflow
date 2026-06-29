import { describe, expect, it } from 'vitest';
import {
  filterAdminNavItems,
  filterAssistantNavItems,
  getAdminNavItems,
  getAssistantNavItems,
  getCourseNavItems,
  getSettingNavItems,
} from '@/components/layout/sidebar-config';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';

const t = (key: string) => key;

describe('sidebar-config', () => {
  it('uses a matcher function for assistant nav items', () => {
    const [homeItem, inventoryItem] = getAssistantNavItems(t as never);

    expect(homeItem.isActive('/')).toBe(true);
    expect(homeItem.isActive('/inventory')).toBe(false);
    expect(inventoryItem.isActive('/inventory')).toBe(true);
    expect(inventoryItem.isActive('/inventory/books')).toBe(false);
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

  it('filters assistant nav items by platform permissions', () => {
    const assistantItems = getAssistantNavItems(t as never);
    const filteredItems = filterAssistantNavItems(assistantItems, [
      PLATFORM_PERMISSION.AI_USE_CHAT,
      PLATFORM_PERMISSION.AI_USE_STUDY,
      PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE,
    ]);

    expect(filteredItems.map((item) => item.url)).toEqual([
      '/',
      '/inventory',
      '/english',
      '/study',
    ]);
  });

  it('filters admin nav items by view or manage platform permissions', () => {
    const adminItems = getAdminNavItems(t as never);
    const filteredItems = filterAdminNavItems(adminItems, [
      PLATFORM_PERMISSION.ROLES_MANAGE,
    ]);

    expect(filteredItems.map((item) => item.url)).toEqual(['/admin/roles']);
  });
});
