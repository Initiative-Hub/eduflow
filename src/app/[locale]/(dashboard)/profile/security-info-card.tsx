import {
  BadgeCheck,
  Loader2,
  Monitor,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseBrowser } from '@/utils/browser-helper';

interface SecurityInfoCardProps {
  provider: string;
  hasPassword: boolean;
  userAgent: string | null;
  onSetPassword?: () => void;
  onChangePassword?: () => void;
  isResetting?: boolean;
  isChanging?: boolean;
}

export function SecurityInfoCard({
  provider,
  hasPassword,
  userAgent,
  onSetPassword,
  onChangePassword,
  isResetting,
  isChanging,
}: SecurityInfoCardProps) {
  const t = useTranslations('ProfilePage');

  const providerKey = ['credential', 'google'].includes(provider)
    ? provider
    : 'unknown';

  const providerLabel = t(`providers.${providerKey}`);
  const browserLabel = userAgent
    ? parseBrowser(userAgent)
    : t('fields.browserUnknown');

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
            <dt className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('fields.loginMethod')}
            </dt>
            <dd className="font-medium text-foreground text-sm">
              {providerLabel}
            </dd>
          </div>

          {/* Password status */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <div className="mb-1.5 flex items-center gap-3">
              <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {t('fields.passwordStatus')}
              </dt>

              <div className="flex items-center gap-1.5">
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
              </div>
            </div>

            <dd>
              {!hasPassword ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onSetPassword}
                  disabled={isResetting}
                  className="h-8 cursor-pointer bg-primary font-semibold hover:bg-primary/90"
                >
                  {isResetting && (
                    <Loader2 className="mr-2 size-3 animate-spin" />
                  )}
                  {t('actions.setPassword')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onChangePassword}
                  disabled={isChanging}
                  className="h-8 cursor-pointer font-semibold"
                >
                  {isChanging && (
                    <Loader2 className="mr-2 size-3 animate-spin" />
                  )}
                  {t('actions.changePassword')}
                </Button>
              )}
            </dd>
          </div>

          {/* Current browser */}
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <dt className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('fields.browser')}
            </dt>
            <dd className="flex items-center gap-1.5">
              <Monitor className="size-4 shrink-0 text-muted-foreground" />
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
