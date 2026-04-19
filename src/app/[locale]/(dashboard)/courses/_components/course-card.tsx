import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Settings } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

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
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold truncate pr-4">
              {title}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-2 min-h-10">
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
      <CardContent className="flex gap-4 text-sm text-foreground/60 mt-auto">
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span>{t('modules', { count: modulesCount })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{t('members', { count: enrollmentsCount })}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <div className="w-full flex gap-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/courses/${id}`}>
              <Settings className="w-4 h-4 mr-2" />
              {t('manage')}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
