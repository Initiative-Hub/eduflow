import { getTranslations } from 'next-intl/server';
import { Spinner } from '@/components/ui/spinner';

export default async function RootLoading() {
  const t = await getTranslations('Loading');

  return (
    <div className="fixed inset-0 z-10000 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md transition-all duration-300">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/20" />
        <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
        <div className="relative rounded-full bg-card p-6 shadow-2xl ring-1 ring-border">
          <Spinner className="h-10 w-10 text-primary" />
        </div>
      </div>
      <div className='fade-in slide-in-from-bottom-5 mt-8 flex animate-in flex-col items-center space-y-2 duration-700'>
        <h2 className="font-bold text-2xl text-primary tracking-tight">
          {t('eduFlow')}
        </h2>
        <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-loader-slide bg-primary" />
        </div>
      </div>
    </div>
  );
}
