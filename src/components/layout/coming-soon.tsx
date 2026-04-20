import { Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ComingSoonProps {
  Icon?: React.ElementType;
  title?: string;
  description?: string;
  returnUrl?: string;
  backLabel?: string;
}

/**
 * Shared placeholder used by feature tabs that are not yet implemented.
 * Replaces six near-identical "Coming Soon" page files.
 */
export function ComingSoon({
  Icon = Construction,
  title = 'Coming Soon',
  description = 'This feature is under construction and will be available soon.',
  returnUrl = '/',
  backLabel = 'Return',
}: ComingSoonProps) {
  return (
    <div className="flex min-h-100 flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-2 font-bold text-2xl">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{description}</p>
      <Link href={returnUrl}>
        <Button variant="default" className="mt-4">
          {backLabel}
        </Button>
      </Link>
    </div>
  );
}
