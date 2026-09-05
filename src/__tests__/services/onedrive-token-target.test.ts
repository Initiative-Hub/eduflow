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
  it.each([
    { label: 'without an authenticate resource', resource: undefined },
    {
      label: 'with the launch resource',
      resource: 'https://onedrive.live.com/picker',
    },
    {
      label: 'with Microsoft personal content resource',
      resource: 'https://my.microsoftpersonalcontent.com',
    },
    {
      label: 'with OneDrive personal API resource',
      resource: 'https://api.onedrive.com',
    },
    {
      label: 'with regional Microsoft personal content resource',
      resource: 'https://storage.my.microsoftpersonalcontent.com/personal/user',
    },
  ])(
    'uses consumers and OneDrive.ReadWrite for personal accounts $label',
    ({ resource }) => {
      const metadata = {
        ...accountIds,
        driveType: 'personal',
        pickerBaseUrl: 'https://onedrive.live.com/picker',
      };
      const target =
        resource === undefined
          ? resolvePickerTokenTarget(metadata)
          : resolvePickerTokenTarget(metadata, resource);

      expect(target).toEqual({
        kind: 'personal-picker',
        resourceOrigin: 'https://onedrive.live.com',
      });
      expect(getTokenTargetAuthority(target)).toBe(
        'https://login.microsoftonline.com/consumers'
      );
      expect(getTokenTargetScopes(target)).toEqual(['OneDrive.ReadWrite']);
    }
  );

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

  it.each([
    'http://api.onedrive.com',
    'http://my.microsoftpersonalcontent.com',
    'https://example.com',
    'https://tenant-my.sharepoint.com',
  ])('rejects an invalid personal Picker resource: %s', (resource) => {
    expect(() =>
      resolvePickerTokenTarget(
        {
          ...accountIds,
          driveType: 'personal',
          pickerBaseUrl: 'https://onedrive.live.com/picker',
        },
        resource
      )
    ).toThrowError(
      expect.objectContaining<Partial<OneDriveAuthorizationError>>({
        code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
      })
    );
  });

  it('rejects a personal connection with an invalid Picker launch URL', () => {
    expect(() =>
      resolvePickerTokenTarget({
        ...accountIds,
        driveType: 'personal',
        pickerBaseUrl: 'https://onedrive.live.com/files',
      })
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
