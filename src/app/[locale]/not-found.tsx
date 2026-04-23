import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function GlobalNotFoundPage() {
  const t = await getTranslations('NotFound');

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-8 h-64 w-64 md:h-80 md:w-80">
        <Image
          src="/images/not-found-robot.png"
          alt="404 Robot"
          fill
          className="animate-float object-contain"
          priority
        />
        {/* Digital speech bubble overlay inspired by user image */}
        <div className="absolute top-10 right-0 rotate-12 rounded-lg bg-primary px-3 py-1 font-mono text-primary-foreground text-sm shadow-xl animate-pulse md:px-4 md:py-2 md:text-base">
          {t('robotSays')}
        </div>
      </div>
      
      <div className="space-y-3">
        <h1 className="font-bold text-5xl tracking-tighter md:text-7xl text-foreground">
          404
        </h1>
        <h2 className="font-semibold text-2xl md:text-3xl text-muted-foreground/80">
          {t('title')}
        </h2>
        <p className="mx-auto max-w-md leading-relaxed text-muted-foreground">
          {t('description')}
        </p>
      </div>
      
      <div className="mt-12">
        <Button asChild size="lg" className="h-12 rounded-full px-10 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          <Link href="/">
            {t('goBack')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
