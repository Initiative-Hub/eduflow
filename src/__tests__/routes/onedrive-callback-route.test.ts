import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/integrations/onedrive/callback/route';
import { OneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';
import {
  ONEDRIVE_OAUTH_RETURN_COOKIE,
  ONEDRIVE_OAUTH_STATE_COOKIE,
} from '@/utils/oauth-utils';

const cookieMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieMocks),
}));

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/onedrive/OneDriveOAuthTokenService', () => ({
  OneDriveOAuthTokenService: {
    authorizePicker: vi.fn(),
    connect: vi.fn(),
  },
}));

const tokenService = OneDriveOAuthTokenService as unknown as {
  authorizePicker: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
};

function setOAuthCookies(flow?: 'connect' | 'picker') {
  const state = JSON.stringify({
    ...(flow ? { flow } : {}),
    nonce: 'oauth-state',
    userId: 'user-1',
  });
  cookieMocks.get.mockImplementation((name: string) => {
    if (name === ONEDRIVE_OAUTH_STATE_COOKIE) return { value: state };
    if (name === ONEDRIVE_OAUTH_RETURN_COOKIE) {
      return { value: '/en/settings/integrations' };
    }
    return undefined;
  });
}

function callbackRequest(query: string) {
  return new Request(
    `https://eduflow.test/api/v1/integrations/onedrive/callback?${query}`
  );
}

describe('OneDrive OAuth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOAuthCookies('picker');
  });

  it('completes Picker consent independently from Graph connection', async () => {
    const response = await GET(
      callbackRequest('code=picker-code&state=oauth-state')
    );

    expect(tokenService.authorizePicker).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'picker-code', userId: 'user-1' })
    );
    expect(tokenService.connect).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain(
      'oneDrive=picker-authorized'
    );
  });

  it('reports canceled Picker consent distinctly', async () => {
    const response = await GET(
      callbackRequest('error=access_denied&state=oauth-state')
    );

    expect(tokenService.authorizePicker).not.toHaveBeenCalled();
    const location = response.headers.get('location');
    expect(location).toContain('oneDrive=picker-error');
    expect(location).toContain('oneDriveReason=consent-canceled');
  });

  it('redirects account switching without replacing the integration', async () => {
    tokenService.authorizePicker.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_ACCOUNT_MISMATCH',
        'Authorize the same Microsoft account that is already connected.'
      )
    );

    const response = await GET(
      callbackRequest('code=picker-code&state=oauth-state')
    );

    expect(response.headers.get('location')).toContain(
      'oneDrive=account-mismatch'
    );
  });

  it('treats legacy state cookies as normal Graph connection flows', async () => {
    setOAuthCookies();

    const response = await GET(
      callbackRequest('code=graph-code&state=oauth-state')
    );

    expect(tokenService.connect).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'graph-code', userId: 'user-1' })
    );
    expect(tokenService.authorizePicker).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain('oneDrive=connected');
  });

  it('rejects tampered OAuth state', async () => {
    const response = await GET(
      callbackRequest('code=picker-code&state=tampered')
    );

    expect(tokenService.authorizePicker).not.toHaveBeenCalled();
    expect(tokenService.connect).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toContain('oneDrive=error');
  });
});
