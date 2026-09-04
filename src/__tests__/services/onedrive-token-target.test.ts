import { describe, expect, it } from 'vitest';
import type { OneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import {
  getTokenTargetAuthority,
  getTokenTargetScopes,
  resolvePickerTokenTarget,
} from '@/services/onedrive/OneDriveTokenTarget';

const accountIds = {
  msalHomeAccountId: 'home-account-1',
  msalLocalAccountId: 'local-account-1',
  msalTenantId: 'tenant-1',
};

describe('OneDrive Picker token targets', () => {
  it('uses consumers and OneDrive.ReadWrite for personal accounts', () => {
    const target = resolvePickerTokenTarget({
      ...accountIds,
      driveType: 'personal',
      pickerBaseUrl: 'https://onedrive.live.com/picker',
    });

    expect(target).toEqual({
      kind: 'personal-picker',
      resourceOrigin: 'https://onedrive.live.com',
    });
    expect(getTokenTargetAuthority(target)).toBe(
      'https://login.microsoftonline.com/consumers'
    );
    expect(getTokenTargetScopes(target)).toEqual(['OneDrive.ReadWrite']);
  });

  it('uses the connected tenant and SharePoint origin for work accounts', () => {
    const target = resolvePickerTokenTarget({
      ...accountIds,
      driveType: 'business',
      pickerBaseUrl: 'https://tenant-my.sharepoint.com/personal/user',
    });

    expect(target).toEqual({
      kind: 'sharepoint-picker',
      resourceOrigin: 'https://tenant-my.sharepoint.com',
      tenantId: 'tenant-1',
    });
    expect(getTokenTargetAuthority(target)).toBe(
      'https://login.microsoftonline.com/tenant-1'
    );
    expect(getTokenTargetScopes(target)).toEqual([
      'https://tenant-my.sharepoint.com/.default',
    ]);
  });

  it.each([
    'https://other-tenant.sharepoint.com',
    'https://example.com',
    'not-a-url',
  ])('rejects an unrelated or malformed resource: %s', (resource) => {
    expect(() =>
      resolvePickerTokenTarget(
        {
          ...accountIds,
          driveType: 'business',
          pickerBaseUrl: 'https://tenant-my.sharepoint.com',
        },
        resource
      )
    ).toThrowError(
      expect.objectContaining<Partial<OneDriveAuthorizationError>>({
        code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
      })
    );
  });

  it('requires durable account and picker metadata', () => {
    expect(() =>
      resolvePickerTokenTarget({
        driveType: 'personal',
        pickerBaseUrl: 'https://onedrive.live.com/picker',
      })
    ).toThrowError(
      expect.objectContaining<Partial<OneDriveAuthorizationError>>({
        code: 'ONEDRIVE_RECONNECT_REQUIRED',
      })
    );
  });
});
