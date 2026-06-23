import type { WordbankReviewMasteryResult } from '@/services/english/SavedVocabularyService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type WordbankTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

export function getMasteryLabel(level: number, t: WordbankTranslator) {
  return level === 2
    ? t('masteryMastered')
    : level === 1
      ? t('masteryFamiliar')
      : t('masteryNew');
}

export function MasteryBadge({
  level,
  t,
}: {
  level: number;
  t: WordbankTranslator;
}) {
  return (
    <Badge
      variant={
        level === 0 ? 'destructive' : level === 1 ? 'secondary' : 'default'
      }
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full bg-current',
          level === 1 && 'opacity-70',
          level === 2 && 'opacity-80'
        )}
      />
      {getMasteryLabel(level, t)}
    </Badge>
  );
}

export function WordbankReviewResults({
  results,
  t,
}: {
  results: WordbankReviewMasteryResult[];
  t: WordbankTranslator;
}) {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reviewResultsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">{t('columnWord')}</TableHead>
              <TableHead>{t('columnMeaning')}</TableHead>
              <TableHead className="w-28">{t('reviewOutcome')}</TableHead>
              <TableHead className="w-44">{t('newMasteryLabel')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.savedVocabularyId}>
                <TableCell className="whitespace-normal align-top font-semibold text-primary">
                  {result.word}
                </TableCell>
                <TableCell className="whitespace-normal align-top">
                  <div className="flex flex-col gap-1">
                    <span className="break-words">
                      {result.englishDefinition}
                    </span>
                    <span className="break-words text-muted-foreground">
                      {result.vietnameseTranslation}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={result.isCorrect ? 'default' : 'destructive'}>
                    {result.isCorrect
                      ? t('reviewResultCorrect')
                      : t('reviewResultMissed')}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {getMasteryLabel(result.previousMasteryLevel, t)}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      {'->'}
                    </span>
                    <MasteryBadge level={result.nextMasteryLevel} t={t} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
