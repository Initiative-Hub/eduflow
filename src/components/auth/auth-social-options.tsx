import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function AuthSocialOptions() {
  const t = useTranslations('AuthSocialOptions');

  return (
    <section className="mt-8 space-y-5" aria-label={t('ariaLabel')}>
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
          {t('orContinueWith')}
        </p>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-12 cursor-pointer rounded-2xl border-border bg-card font-semibold text-foreground hover:bg-muted/40"
        >
          <span className="inline-flex size-6 items-center justify-center rounded-sm bg-primary/10 font-bold text-primary text-xs">
            <Image
              src="/icons/brands/google.svg"
              alt="Google"
              width={16}
              height={16}
            />
          </span>
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-12 cursor-pointer rounded-2xl border-border bg-card font-semibold text-foreground hover:bg-muted/40"
        >
          <span className="inline-flex size-6 items-center justify-center rounded-sm bg-primary/10 font-bold text-primary text-xs">
            <Image
              src="/icons/brands/microsoft.svg"
              alt="Google"
              width={16}
              height={16}
            />
          </span>
          Microsoft
        </Button>
      </div>
    </section>
  );
}
