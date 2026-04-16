'use client';

import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getRoleBadgeVariant(role: string | null) {
  switch (role) {
    case 'ADMIN':
      return 'default';
    case 'TEACHER':
      return 'secondary';
    default:
      return 'outline';
  }
}

interface AccountDetailsCardProps {
  role: string | null;
  createdAt: string; // ISO string
  emailVerified: boolean;
}

export function AccountDetailsCard({
  role,
  createdAt,
  emailVerified,
}: AccountDetailsCardProps) {
  const t = useTranslations('ProfilePage');
  const locale = useLocale();

  const memberSince = new Date(createdAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const roleKey = role?.toLowerCase();
  const roleLabel = roleKey ? t(`roles.${roleKey}`) : '—';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="size-4 text-primary" />
          {t('sections.accountDetails')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Role */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('fields.role')}
            </dt>
            <dd>
              <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                {roleLabel}
              </Badge>
            </dd>
          </div>

          {/* Member since */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('fields.memberSince')}
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {memberSince}
            </dd>
          </div>

          {/* Email verification */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('fields.email')}
            </dt>
            <dd className="flex items-center gap-1.5">
              {emailVerified ? (
                <>
                  <BadgeCheck className="size-4 text-primary" />
                  <span className="font-medium text-primary text-sm">
                    {t('fields.emailVerified')}
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-destructive" />
                  <span className="font-medium text-destructive text-sm">
                    {t('fields.emailNotVerified')}
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
