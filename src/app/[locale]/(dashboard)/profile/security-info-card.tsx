'use client';

import { BadgeCheck, Monitor, Shield, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseBrowser } from '@/lib/utils';

interface SecurityInfoCardProps {
  provider: string;
  hasPassword: boolean;
  userAgent: string | null;
}

export function SecurityInfoCard({
  provider,
  hasPassword,
  userAgent,
}: SecurityInfoCardProps) {
  const t = useTranslations('ProfilePage');

  const providerKey = (
    ['credential', 'google', 'github'].includes(provider) ? provider : 'unknown'
  ) as keyof {
    credential: string;
    google: string;
    github: string;
    unknown: string;
  };

  const providerLabel = t(`providers.${providerKey}`);
  const browserLabel = parseBrowser(userAgent) || t('fields.browserUnknown');

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4 text-primary" />
          {t('sections.security')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Login Method */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('fields.loginMethod')}
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {providerLabel}
            </dd>
          </div>

          {/* Password status */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('fields.passwordStatus')}
            </dt>
            <dd className="flex items-center gap-1.5">
              {hasPassword ? (
                <>
                  <BadgeCheck className="size-4 text-primary" />
                  <span className="font-medium text-primary text-sm">
                    {t('fields.passwordSet')}
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground text-sm">
                    {t('fields.passwordNotSet')}
                  </span>
                </>
              )}
            </dd>
          </div>

          {/* Current browser */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('fields.browser')}
            </dt>
            <dd className="flex items-center gap-1.5">
              <Monitor className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground text-sm">
                {browserLabel}
              </span>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
