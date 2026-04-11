import { describe, expect, it } from 'vitest';
import { getApiDocs } from '@/lib/swagger';

describe('getApiDocs', () => {
  it('should expose cookie-based auth in the swagger spec', async () => {
    process.env.BETTER_AUTH_COOKIE_NAME = 'better-auth.session_token';

    const spec = (await getApiDocs()) as any;

    expect(spec.components?.securitySchemes?.SessionCookie).toEqual({
      type: 'apiKey',
      in: 'cookie',
      name: 'better-auth.session_token',
    });
    expect(spec.security).toEqual([{ SessionCookie: [] }]);
  });
});
