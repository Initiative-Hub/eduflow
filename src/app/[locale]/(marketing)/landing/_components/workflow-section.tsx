import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { SectionHeading } from './section-heading';

const stepKeys = ['bring', 'shape', 'engage', 'understand'] as const;

export async function WorkflowSection() {
  const t = await getTranslations('LandingPage.workflow');

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stepKeys.map((key, index) => (
            <li key={key} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-heading font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <Separator />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-heading font-semibold text-xl">
                  {t(`steps.${key}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  {t(`steps.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
