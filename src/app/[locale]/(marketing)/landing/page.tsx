import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AudienceSection } from './_components/audience-section';
import { ContactSection } from './_components/contact-section';
import { CtaSection } from './_components/cta-section';
import { FaqSection } from './_components/faq-section';
import { FeaturesSection } from './_components/features-section';
import { HeroSection } from './_components/hero-section';
import { PricingSection } from './_components/pricing-section';
import { TrustSection } from './_components/trust-section';
import { WorkflowSection } from './_components/workflow-section';
import styles from './landing.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('LandingPage.metadata');

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      title: t('title'),
      description: t('description'),
    },
  };
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <HeroSection />
      <AudienceSection />
      <WorkflowSection />
      <FeaturesSection />
      <TrustSection />
      <PricingSection />
      <FaqSection />
      <ContactSection />
      <CtaSection />
    </div>
  );
}
