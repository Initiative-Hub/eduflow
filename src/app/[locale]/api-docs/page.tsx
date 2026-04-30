import { getTranslations } from 'next-intl/server';
import { SwaggerDocs } from '@/components/swagger/swagger-docs';
import 'swagger-ui-react/swagger-ui.css';
import { notFound } from 'next/navigation';
import { PROD_MODE } from '@/constants/common';

export default async function ApiDocsPage() {
  if (PROD_MODE) notFound();

  const t = await getTranslations('ApiDocsPage');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <div className="space-y-2">
        <p className="font-semibold text-muted-foreground text-sm">
          {t('title')}
        </p>
        <h1 className="font-bold text-3xl tracking-tight">
          {t('description')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('cookieHint')}</p>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <SwaggerDocs specUrl="/api/docs" />
      </div>
    </div>
  );
}
