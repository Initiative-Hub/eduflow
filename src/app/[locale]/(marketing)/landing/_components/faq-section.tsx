import { getTranslations } from 'next-intl/server';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';

const faqKeys = [
  'audience',
  'materials',
  'socratic',
  'content',
  'languages',
  'sharing',
  'pricing',
] as const;

export async function FaqSection() {
  const t = await getTranslations('LandingPage.faq');

  return (
    <section
      id="faq"
      className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
        </div>
        <Reveal className="lg:col-span-7" delay={0.08}>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border bg-card px-5 sm:px-7"
          >
            {faqKeys.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="py-5 text-base">
                  {t(`${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground leading-7">
                  <p>{t(`${key}.answer`)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
