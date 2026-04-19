import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

/**
 * Shared placeholder used by feature tabs that are not yet implemented.
 * Replaces six near-identical "Coming Soon" page files.
 */
export function ComingSoonPage({
  title,
  description = 'This feature is under construction and will be available soon.',
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
