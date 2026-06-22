import { describe, expect, it } from 'vitest';
import {
  getAssistantNavItems,
  getCourseNavItems,
  getSettingNavItems,
} from '@/components/layout/sidebar-config';

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
    const systemSettingsItem = settingsItems[2];

    expect(systemSettingsItem.isActive('/settings')).toBe(true);
    expect(systemSettingsItem.isActive('/settings/ai-preferences')).toBe(true);
  });

  it('supports course items that only match the course root route', () => {
    const courseItems = getCourseNavItems('course-123');

    expect(courseItems[0].isActive('/courses/course-123')).toBe(true);
    expect(courseItems[0].isActive('/courses/course-123/chat')).toBe(true);
  });
});
