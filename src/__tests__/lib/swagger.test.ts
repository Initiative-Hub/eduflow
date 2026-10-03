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
  it('documents OneDrive export, destination, status, disconnect, and both imports', async () => {
    const spec = (await getApiDocs()) as any;
    for (const [path, method] of [
      ['/api/v1/integrations/onedrive/destination', 'put'],
      ['/api/v1/integrations/onedrive/exports', 'post'],
      ['/api/v1/integrations/onedrive/status', 'get'],
      ['/api/v1/integrations/onedrive/disconnect', 'delete'],
      ['/api/v1/storage/import/onedrive', 'post'],
      ['/api/v1/courses/{courseId}/storage/import/onedrive', 'post'],
    ]) {
      expect(spec.paths[path]?.[method]?.security).toEqual([
        { SessionCookie: [] },
      ]);
      expect(spec.paths[path]?.[method]?.responses).toHaveProperty('401');
    }
    const exports = spec.paths['/api/v1/integrations/onedrive/exports'].post;
    expect(
      exports.requestBody.content['application/json'].schema.properties.source
        .oneOf
    ).toHaveLength(4);
  });
});
