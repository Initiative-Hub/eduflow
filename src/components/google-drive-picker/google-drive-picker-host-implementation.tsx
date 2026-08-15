/// <reference types="google.picker" />

'use client';

import {
  DrivePicker,
  DrivePickerDocsView,
  type DrivePickerProps,
} from '@googleworkspace/drive-picker-react';
import { useEffect, useRef } from 'react';
import type { GoogleDrivePickerHostProps } from './google-drive-picker-host';

type PickedEvent = Parameters<NonNullable<DrivePickerProps['onPicked']>>[0];

export function GoogleDrivePickerHostImplementation({
  accessToken,
  apiKey,
  appId,
  mode,
  onCanceled,
  onError,
  onPicked,
}: GoogleDrivePickerHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const picker = containerRef.current?.querySelector('drive-picker');
    if (!picker) return;
    picker.addEventListener('picker-error', onError);
    return () => picker.removeEventListener('picker-error', onError);
  }, [onError]);

  const handlePicked = (event: PickedEvent) => {
    const documents = event.detail.docs ?? [];
    onPicked(
      documents.flatMap((document) => {
        const id = document.id;
        return id ? [id] : [];
      })
    );
  };

  return (
    <div ref={containerRef}>
      <DrivePicker
        app-id={appId}
        developer-key={apiKey}
        oauth-token={accessToken}
        origin={window.location.origin}
        onCanceled={onCanceled}
        onOauthError={onError}
        onPicked={handlePicked}
      >
        {mode === 'folder' ? (
          <DrivePickerDocsView
            include-folders="true"
            mode="LIST"
            select-folder-enabled="true"
            view-id="FOLDERS"
          />
        ) : (
          <DrivePickerDocsView mode="LIST" view-id="DOCS" />
        )}
      </DrivePicker>
    </div>
  );
}
