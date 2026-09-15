import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  align?: 'left' | 'center';
  description: string;
  eyebrow: string;
  title: string;
}

export function SectionHeading({
  align = 'left',
  description,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex max-w-3xl flex-col gap-3',
        align === 'center' && 'mx-auto items-center text-center'
      )}
    >
      <p className="font-semibold text-primary text-sm uppercase tracking-[0.18em]">
        {eyebrow}
      </p>
      <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="text-pretty text-base text-muted-foreground leading-7 sm:text-lg">
        {description}
      </p>
    </div>
  );
}
