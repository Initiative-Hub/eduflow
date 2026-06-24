import { BookOpen, Check, Globe, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  id: string;
  title: string;
  description: string | null | undefined;
  isPublished: boolean;
  isOwner: boolean;
  modulesCount: number;
  enrollmentsCount: number;
  membershipStatus?: 'ACTIVE' | 'PENDING_INVITE' | null;
  pendingInvitationId?: string | null;
  onAcceptInvitation: (invitationId: string) => void;
  onDeclineInvitation: (invitationId: string) => void;
  onTogglePublish: (id: string, isPublished: boolean) => void;
}

export function CourseCard({
  id,
  title,
  description,
  isPublished,
  isOwner,
  modulesCount,
  enrollmentsCount,
  membershipStatus,
  pendingInvitationId,
  onAcceptInvitation,
  onDeclineInvitation,
  onTogglePublish,
}: CourseCardProps) {
  const t = useTranslations('Courses.Card');
  const isPendingInvite = membershipStatus === 'PENDING_INVITE';

  return (
    <Card
      className={cn(
        'group/card relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-0 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-sm'
      )}
    >
      {/* Top Background / Banner */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b bg-linear-to-br from-muted/70 to-muted/20">
        {/* Centered course icon with card hover scale-up effect */}
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border bg-background shadow-sm transition-transform duration-300 group-hover/card:scale-105">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>

        {/* Badge & Publish switch overlay */}
        {isOwner && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <Badge variant="secondary" className="pointer-events-none">
              {t('owned')}
            </Badge>
            <div className="flex items-center gap-1.5 rounded-full border bg-background/90 py-0.5 pr-1 pl-2 shadow-sm">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch
                checked={isPublished}
                onCheckedChange={(val) => onTogglePublish(id, val)}
                aria-label={t('togglePublish')}
                size="sm"
                className="origin-right scale-75"
              />
            </div>
          </div>
        )}
        {isPendingInvite ? (
          <div className="absolute top-3 right-3 z-20">
            <Badge variant="outline" className="bg-background/90">
              {t('pendingInvite')}
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Course Info Section */}
      <div className="flex flex-1 flex-col p-5">
        {isPendingInvite ? (
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-semibold text-foreground text-lg leading-snug">
              {title}
            </h3>
            <p className="mt-2 line-clamp-2 min-h-10 text-muted-foreground text-sm leading-relaxed">
              {description || (
                <span className="text-muted-foreground/70 italic">
                  {t('noDescription')}
                </span>
              )}
            </p>
          </div>
        ) : (
          <Link href={`/courses/${id}`} className="min-w-0 flex-1 outline-none">
            <h3 className="line-clamp-2 font-semibold text-foreground text-lg leading-snug transition-colors group-hover/card:text-primary">
              {title}
            </h3>
            <p className="mt-2 line-clamp-2 min-h-10 text-muted-foreground text-sm leading-relaxed">
              {description || (
                <span className="text-muted-foreground/70 italic">
                  {t('noDescription')}
                </span>
              )}
            </p>
          </Link>
        )}

        {/* Divider */}
        <Separator className="my-4" />

        {/* Metrics Row */}
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground text-sm tabular-nums">
              {modulesCount}
            </span>
            <span>{t('moduleLabel')}</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground text-sm tabular-nums">
              {enrollmentsCount}
            </span>
            <span>{t('memberLabel')}</span>
          </div>
        </div>
        {isPendingInvite && pendingInvitationId ? (
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onAcceptInvitation(pendingInvitationId)}
            >
              <Check data-icon="inline-start" />
              {t('accept')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDeclineInvitation(pendingInvitationId)}
            >
              <X data-icon="inline-start" />
              {t('decline')}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
