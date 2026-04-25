import { BookOpen, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface CourseCardProps {
  id: string;
  title: string;
  description: string | null;
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
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
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
          <Switch
            checked={isPublished}
            onCheckedChange={(val) => onTogglePublish(id, val)}
            aria-label={t('togglePublish')}
          />
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
      <CardFooter className="border-t pt-4">
        <div className="flex w-full gap-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/courses/${id}`}>
              <Settings className="mr-2 h-4 w-4" />
              {t('manage')}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
