import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function ChatNotFoundPage() {
  const t = await getTranslations('AIChat');

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-semibold text-2xl tracking-tight">
        {t('chatNotFound.title')}
      </h1>
      <p className="text-muted-foreground">{t('chatNotFound.description')}</p>
      <Button asChild>
        <Link href="/">{t('chatNotFound.action')}</Link>
      </Button>
    </div>
  );
}
