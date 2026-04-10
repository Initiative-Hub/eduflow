'use client';

import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

type SwaggerDocsProps = {
  specUrl: string;
};

export function SwaggerDocs({ specUrl }: SwaggerDocsProps) {
  return (
    <SwaggerUI
      url={specUrl}
      docExpansion="none"
      deepLinking
      persistAuthorization
      requestInterceptor={(request) => {
        request.credentials = 'include';
        return request;
      }}
    />
  );
}
