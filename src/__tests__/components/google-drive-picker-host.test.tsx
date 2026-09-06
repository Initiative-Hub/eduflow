import { fireEvent, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDrivePickerHostImplementation } from '@/components/google-drive-picker/google-drive-picker-host-implementation';

type MockPickerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  onCanceled: () => void;
  onPicked: (event: { detail: { docs: Array<{ id: string }> } }) => void;
};

vi.mock('@googleworkspace/drive-picker-react', () => ({
  DrivePicker: ({
    children,
    onCanceled,
    onPicked,
    ...props
  }: MockPickerProps) => (
    <div data-testid="picker" {...props}>
      <button
        type="button"
        onClick={() => onPicked({ detail: { docs: [{ id: 'file-1' }] } })}
      >
        pick
      </button>
      <button type="button" onClick={onCanceled}>
        cancel
      </button>
      {children}
    </div>
  ),
  DrivePickerDocsView: (props: HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="docs-view" {...props} />
  ),
}));

describe('GoogleDrivePickerHostImplementation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the server token and file view to the official wrapper', () => {
    const onPicked = vi.fn();
    render(
      <GoogleDrivePickerHostImplementation
        accessToken="server-token"
        apiKey="picker-key"
        appId="drive-app-id"
        mode="files"
        onCanceled={vi.fn()}
        onError={vi.fn()}
        onPicked={onPicked}
      />
    );

    expect(screen.getByTestId('picker')).toHaveAttribute(
      'oauth-token',
      'server-token'
    );
    expect(screen.getByTestId('picker')).toHaveAttribute(
      'developer-key',
      'picker-key'
    );
    expect(screen.getByTestId('docs-view')).toHaveAttribute('view-id', 'DOCS');
    fireEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(onPicked).toHaveBeenCalledWith(['file-1']);
  });

  it('configures folder-only selection and forwards cancellation', () => {
    const onCanceled = vi.fn();
    render(
      <GoogleDrivePickerHostImplementation
        accessToken="server-token"
        apiKey="picker-key"
        appId="drive-app-id"
        mode="folder"
        onCanceled={onCanceled}
        onError={vi.fn()}
        onPicked={vi.fn()}
      />
    );

    expect(screen.getByTestId('docs-view')).toHaveAttribute(
      'view-id',
      'FOLDERS'
    );
    expect(screen.getByTestId('docs-view')).toHaveAttribute(
      'include-folders',
      'true'
    );
    expect(screen.getByTestId('docs-view')).toHaveAttribute(
      'select-folder-enabled',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(onCanceled).toHaveBeenCalledOnce();
  });
});
