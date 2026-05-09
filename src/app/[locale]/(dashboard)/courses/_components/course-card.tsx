import { BookOpen, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface CourseCardProps {
  id: string;
  title: string;
  description: string | null | undefined;
  isPublished: boolean;
  modulesCount: number;
  enrollmentsCount: number;
  onTogglePublish: (id: string, isPublished: boolean) => void;
}

export function CourseCard({
  id,
  title,
  description,
  isPublished,
  modulesCount,
  enrollmentsCount,
  onTogglePublish,
}: CourseCardProps) {
  const t = useTranslations('Courses.Card');

  return (
    <Link href={`/courses/${id}`} className="block h-full cursor-default">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="truncate pr-4 font-bold text-xl">
                {title}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2 min-h-10">
                {description || t('noDescription')}
              </CardDescription>
            </div>
            <div onClick={(e) => e.preventDefault()}>
              <Switch
                checked={isPublished}
                onCheckedChange={(val) => onTogglePublish(id, val)}
                aria-label={t('togglePublish')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex gap-4 text-foreground/60 text-sm">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{t('modules', { count: modulesCount })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{t('members', { count: enrollmentsCount })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
