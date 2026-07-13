import { ExternalLink, GraduationCap, Sparkles } from 'lucide-react';
import Link from 'next/link';

type SharedStudyChatHeaderProps = {
  ctaHref: string;
  isOwner: boolean;
  t: (key: string) => string;
  title: string;
};

export const SharedStudyChatHeader = ({
  ctaHref,
  isOwner,
  t,
  title,
}: SharedStudyChatHeaderProps) => {
  const CtaIcon = isOwner ? ExternalLink : GraduationCap;

  return (
    <header className="border-border border-b pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 font-medium text-primary text-sm">
          <Sparkles className="size-4" />
          <span>{t('createdBy')}</span>
        </p>

        <Link
          href={ctaHref}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CtaIcon className="size-4" />
          <span>{isOwner ? t('ownerCta') : t('visitorCta')}</span>
        </Link>
      </div>

      <div className="mt-5 max-w-3xl space-y-2">
        <p className="font-medium text-muted-foreground text-sm">
          {t('eyebrow')}
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isOwner ? t('ownerHelper') : t('visitorHelper')}
        </p>
      </div>
    </header>
  );
};
