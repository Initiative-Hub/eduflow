'use client';

import dynamic from 'next/dynamic';

export type OneDrivePickedItem = {
  driveId: string;
  itemId: string;
};

export type OneDrivePickerHostProps = {
  accessToken: string;
  baseUrl: string;
  mode: 'files' | 'folder';
  onAuthenticate: (input: {
    command?: string;
    resource?: string;
  }) => Promise<string>;
  onCanceled: () => void;
  onError: () => void;
  onPicked: (items: OneDrivePickedItem[]) => void;
};

const OneDrivePickerHostImplementation = dynamic(
  () =>
    import('./onedrive-picker-host-implementation').then(
      (module) => module.OneDrivePickerHostImplementation
    ),
  { ssr: false }
);

export function OneDrivePickerHost(props: OneDrivePickerHostProps) {
  return <OneDrivePickerHostImplementation {...props} />;
}
