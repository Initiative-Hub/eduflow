import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';

describe('OneDrive Picker authorization copy', () => {
  it.each([en, vi])(
    'localizes the dialog and callback outcomes',
    (messages) => {
      expect(messages.OneDrivePickerAuthorization.authorize).toBeTruthy();
      expect(
        messages.IntegrationsPage.notice.oneDrivePickerAuthorizedDescription
      ).toBeTruthy();
      expect(
        messages.IntegrationsPage.notice.oneDrivePickerCanceledDescription
      ).toBeTruthy();
      expect(
        messages.IntegrationsPage.notice.oneDrivePickerMismatchDescription
      ).toBeTruthy();
    }
  );
});
