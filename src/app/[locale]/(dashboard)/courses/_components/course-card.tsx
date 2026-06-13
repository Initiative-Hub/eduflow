import { Globe } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
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
  onTogglePublish: (id: string, isPublished: boolean) => void;
}

function CourseMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold text-foreground text-lg tabular-nums leading-none">
        {value}
      </div>
    </div>
  );
}

export function CourseCard({
  id,
  title,
  description,
  isPublished,
  isOwner,
  modulesCount,
  enrollmentsCount,
  onTogglePublish,
}: CourseCardProps) {
  const t = useTranslations('Courses.Card');

  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-none transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-muted/20'
      )}
    >
      <CardContent className="gap-4 p-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/courses/${id}`}
            className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CardTitle className="text-balance font-semibold text-xl leading-tight transition-colors group-hover:text-primary">
              {title}
            </CardTitle>
            <CardDescription className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed">
              {description || t('noDescription')}
            </CardDescription>
          </Link>
          {isOwner && (
            <div className="flex items-center gap-3">
              <Badge variant="outline">Owned</Badge>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={isPublished}
                  onCheckedChange={(val) => onTogglePublish(id, val)}
                  aria-label={t('togglePublish')}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto p-5 pt-2">
        <div className="flex gap-3 pt-4">
          <CourseMetric label={t('moduleLabel')} value={modulesCount} />
          <CourseMetric label={t('memberLabel')} value={enrollmentsCount} />
        </div>
      </CardFooter>
    </Card>
  );
}
