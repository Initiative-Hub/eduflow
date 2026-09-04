import { OneDriveAuthorizationError } from './OneDriveAuthorizationError';
import type { OneDriveMetadata } from './onedrive-types';

const PERSONAL_PICKER_ORIGIN = 'https://onedrive.live.com';

export type OneDriveTokenTarget =
  | { kind: 'graph' }
  | {
      kind: 'personal-picker';
      resourceOrigin: typeof PERSONAL_PICKER_ORIGIN;
    }
  | {
      kind: 'sharepoint-picker';
      resourceOrigin: string;
      tenantId: string;
    };

function invalidPickerResource(message = 'Invalid OneDrive picker resource.') {
  return new OneDriveAuthorizationError(
    'ONEDRIVE_INVALID_PICKER_RESOURCE',
    message
  );
}

export function normalizePickerOrigin(resource: string) {
  try {
    const url = new URL(resource);
    if (url.protocol !== 'https:') throw invalidPickerResource();
    return url.origin.toLowerCase();
  } catch (error) {
    if (error instanceof OneDriveAuthorizationError) throw error;
    throw invalidPickerResource();
  }
}

function requirePickerMetadata(metadata: OneDriveMetadata) {
  if (
    !metadata.driveType ||
    !metadata.pickerBaseUrl ||
    !metadata.msalHomeAccountId ||
    !metadata.msalLocalAccountId ||
    !metadata.msalTenantId
  ) {
    throw new OneDriveAuthorizationError(
      'ONEDRIVE_RECONNECT_REQUIRED',
      'OneDrive connection metadata is incomplete. Reconnect OneDrive.'
    );
  }
}

export function resolvePickerTokenTarget(
  metadata: OneDriveMetadata,
  requestedResource?: string | null
): OneDriveTokenTarget {
  requirePickerMetadata(metadata);
  const configuredOrigin = normalizePickerOrigin(metadata.pickerBaseUrl!);
  const requestedOrigin = requestedResource
    ? normalizePickerOrigin(requestedResource)
    : configuredOrigin;

  if (metadata.driveType === 'personal') {
    if (
      configuredOrigin !== PERSONAL_PICKER_ORIGIN ||
      requestedOrigin !== PERSONAL_PICKER_ORIGIN
    ) {
      throw invalidPickerResource(
        'The requested Picker resource does not match the connected personal OneDrive.'
      );
    }
    return {
      kind: 'personal-picker',
      resourceOrigin: PERSONAL_PICKER_ORIGIN,
    };
  }

  if (metadata.driveType !== 'business') {
    throw new OneDriveAuthorizationError(
      'ONEDRIVE_RECONNECT_REQUIRED',
      'The connected OneDrive type is not supported. Reconnect OneDrive.'
    );
  }

  const configuredHost = new URL(configuredOrigin).hostname;
  if (
    !configuredHost.endsWith('.sharepoint.com') &&
    !configuredHost.endsWith('.sharepoint-df.com')
  ) {
    throw invalidPickerResource(
      'The connected work or school OneDrive has an invalid Picker resource.'
    );
  }
  if (requestedOrigin !== configuredOrigin) {
    throw invalidPickerResource(
      'The requested Picker resource does not belong to the connected OneDrive.'
    );
  }

  return {
    kind: 'sharepoint-picker',
    resourceOrigin: configuredOrigin,
    tenantId: metadata.msalTenantId!,
  };
}

export function getTokenTargetScopes(target: OneDriveTokenTarget) {
  if (target.kind === 'graph') {
    return [
      'openid',
      'email',
      'profile',
      'offline_access',
      'User.Read',
      'Files.ReadWrite',
    ];
  }
  if (target.kind === 'personal-picker') return ['OneDrive.ReadWrite'];
  return [`${target.resourceOrigin}/.default`];
}

export function getTokenTargetAuthority(target: OneDriveTokenTarget) {
  if (target.kind === 'personal-picker') {
    return 'https://login.microsoftonline.com/consumers';
  }
  if (target.kind === 'sharepoint-picker') {
    return `https://login.microsoftonline.com/${encodeURIComponent(target.tenantId)}`;
  }
  return null;
}
