import { createSwaggerSpec } from 'next-swagger-doc';

const defaultCookieName = 'better-auth.session_token';

export const getApiDocs = async () => {
  const cookieName = process.env.BETTER_AUTH_COOKIE_NAME ?? defaultCookieName;
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Next.js Swagger API',
        version: '1.0',
      },
      components: {
        securitySchemes: {
          SessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: cookieName,
          },
        },
      },
      security: [{ SessionCookie: [] }],
    },
  });
  return spec;
};
