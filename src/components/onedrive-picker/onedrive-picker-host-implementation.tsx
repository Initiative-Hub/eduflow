'use client';

import { useEffect, useEffectEvent } from 'react';
import type { OneDrivePickerHostProps } from './onedrive-picker-host';
import { startOneDrivePickerSession } from './onedrive-picker-session';

export function OneDrivePickerHostImplementation({
  accessToken,
  baseUrl,
  channelId,
  mode,
  pickerWindow,
  onAuthenticate,
  onCanceled,
  onError,
  onPicked,
}: OneDrivePickerHostProps) {
  const authenticate = useEffectEvent(onAuthenticate);
  const canceled = useEffectEvent(onCanceled);
  const failed = useEffectEvent(onError);
  const picked = useEffectEvent(onPicked);
  useEffect(
    () =>
      startOneDrivePickerSession({
        accessToken,
        baseUrl,
        channelId,
        mode,
        pickerWindow,
        onAuthenticate: authenticate,
        onCanceled: canceled,
        onError: failed,
        onPicked: picked,
      }),
    [accessToken, baseUrl, channelId, mode, pickerWindow]
  );
  return null;
}
