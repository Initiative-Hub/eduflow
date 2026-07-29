import { describe, expect, it } from 'vitest';
import * as oauthUtils from '@/utils/oauth-utils';

describe('Google Drive OAuth state helpers', () => {
  it('stores the initiating EduFlow user id separately from the public nonce', () => {
    const state = (
      oauthUtils as unknown as {
        createGoogleDriveOAuthState: (input: { userId: string }) => {
          cookieValue: string;
          nonce: string;
        };
      }
    ).createGoogleDriveOAuthState({ userId: 'user-1' });

    expect(state.nonce).toEqual(expect.any(String));
    expect(state.cookieValue).toContain('user-1');

    const parsed = (
      oauthUtils as unknown as {
        assertGoogleDriveOAuthState: (
          receivedNonce: string,
          cookieValue: string,
          currentUserId: string
        ) => void;
      }
    ).assertGoogleDriveOAuthState(state.nonce, state.cookieValue, 'user-1');

    expect(parsed).toBeUndefined();
  });

  it('rejects callbacks completed under a different EduFlow session', () => {
    const state = (
      oauthUtils as unknown as {
        createGoogleDriveOAuthState: (input: { userId: string }) => {
          cookieValue: string;
          nonce: string;
        };
      }
    ).createGoogleDriveOAuthState({ userId: 'user-1' });

    expect(() =>
      (
        oauthUtils as unknown as {
          assertGoogleDriveOAuthState: (
            receivedNonce: string,
            cookieValue: string,
            currentUserId: string
          ) => void;
        }
      ).assertGoogleDriveOAuthState(state.nonce, state.cookieValue, 'user-2')
    ).toThrow('Google Drive OAuth session changed.');
  });

  it('rejects callbacks with a nonce that does not match the state cookie', () => {
    const state = (
      oauthUtils as unknown as {
        createGoogleDriveOAuthState: (input: { userId: string }) => {
          cookieValue: string;
          nonce: string;
        };
      }
    ).createGoogleDriveOAuthState({ userId: 'user-1' });

    expect(() =>
      (
        oauthUtils as unknown as {
          assertGoogleDriveOAuthState: (
            receivedNonce: string,
            cookieValue: string,
            currentUserId: string
          ) => void;
        }
      ).assertGoogleDriveOAuthState('wrong-nonce', state.cookieValue, 'user-1')
    ).toThrow('Invalid Google Drive OAuth state.');
  });
});
