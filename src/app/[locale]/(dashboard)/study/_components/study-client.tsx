import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';

const studySubjects = [
  'math',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'english',
  'other',
] as const;

type StudySubject = (typeof studySubjects)[number];

const subjectIcons: Record<StudySubject, LucideIcon> = {
  math: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  history: Landmark,
  geography: Globe2,
  english: Languages,
  other: BookOpen,
};

export async function StudyClient() {
  const t = await getTranslations('StudyPage');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="space-y-3 text-center">
        <h1 className="font-black font-heading text-3xl text-foreground tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-base text-muted-foreground leading-7 sm:text-lg">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {studySubjects.map((subject) => {
          const Icon = subjectIcons[subject];

          return (
            <Card
              className="min-h-44 rounded-[1.5rem] border border-border/60 bg-card/95 p-5 shadow-md shadow-primary/5 transition-transform duration-200 hover:-translate-y-1"
              key={subject}
            >
              <div className="flex h-full flex-col">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="mt-6 space-y-2">
                  <h2 className="font-bold text-foreground text-lg leading-tight">
                    {t(`subjects.${subject}.title`)}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-6">
                    {t(`subjects.${subject}.description`)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
