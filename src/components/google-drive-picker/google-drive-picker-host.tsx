'use client';

import dynamic from 'next/dynamic';

export type GoogleDrivePickerHostProps = {
  accessToken: string;
  apiKey: string;
  appId: string;
  mode: 'files' | 'folder';
  onCanceled: () => void;
  onError: () => void;
  onPicked: (fileIds: string[]) => void;
};

const GoogleDrivePickerHostImplementation = dynamic(
  () =>
    import('./google-drive-picker-host-implementation').then(
      (module) => module.GoogleDrivePickerHostImplementation
    ),
  { ssr: false }
);

export function GoogleDrivePickerHost(props: GoogleDrivePickerHostProps) {
  return <GoogleDrivePickerHostImplementation {...props} />;
}
