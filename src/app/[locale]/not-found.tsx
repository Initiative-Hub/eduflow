import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function GlobalNotFoundPage() {
  const t = await getTranslations('NotFound');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-8 h-64 w-64 md:h-80 md:w-80">
        <Image
          src="/images/not-found-robot.png"
          alt="404 Robot"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-3">
        <h1 className="font-bold text-5xl text-foreground tracking-tighter md:text-7xl">
          404
        </h1>
        <h2 className="font-semibold text-2xl text-muted-foreground/80 md:text-3xl">
          {t('title')}
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground leading-relaxed">
          {t('description')}
        </p>
      </div>

      <div className="mt-12">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-full px-10 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <Link href="/">{t('goBack')}</Link>
        </Button>
      </div>
    </div>
  );
}
