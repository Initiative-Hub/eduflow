import { OneDriveAuthorizationError } from './OneDriveAuthorizationError';
import type { OneDriveMetadata } from './onedrive-types';

const PERSONAL_PICKER_ORIGIN = 'https://onedrive.live.com';
const PERSONAL_PICKER_API_HOST = 'api.onedrive.com';
const PERSONAL_PICKER_CONTENT_HOST = 'microsoftpersonalcontent.com';

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

function isPersonalPickerLaunchUrl(resource: string) {
  try {
    const url = new URL(resource);
    return (
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === 'onedrive.live.com' &&
      url.pathname.replace(/\/+$/, '') === '/picker' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isPersonalPickerResourceOrigin(origin: string) {
  if (origin === PERSONAL_PICKER_ORIGIN) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return (
      host === PERSONAL_PICKER_API_HOST ||
      host === `my.${PERSONAL_PICKER_CONTENT_HOST}` ||
      host.endsWith(`.${PERSONAL_PICKER_CONTENT_HOST}`)
    );
  } catch {
    return false;
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
      !isPersonalPickerLaunchUrl(metadata.pickerBaseUrl!) ||
      !isPersonalPickerResourceOrigin(requestedOrigin)
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
