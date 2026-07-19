'use client';

import { Bot, Cloud, Globe, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TranslationProvider } from '@/services/english/TranslationService';

interface ProviderConfig {
  id: TranslationProvider;
  nameKey: string;
  badgeKey: string;
  badgeVariant: 'free' | 'limited' | 'ai';
  icon: React.ElementType;
  infoKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'amazon',
    nameKey: 'providerAmazon',
    badgeKey: 'providerAmazonBadge',
    badgeVariant: 'limited',
    icon: Cloud,
    infoKey: 'providerAmazonInfo',
  },
  {
    id: 'mymemory',
    nameKey: 'providerMyMemory',
    badgeKey: 'providerMyMemoryBadge',
    badgeVariant: 'free',
    icon: Globe,
    infoKey: 'providerMyMemoryInfo',
  },
  {
    id: 'ai',
    nameKey: 'providerAI',
    badgeKey: 'providerAIBadge',
    badgeVariant: 'ai',
    icon: Bot,
    infoKey: 'providerAIInfo',
  },
];

const badgeStyles: Record<ProviderConfig['badgeVariant'], string> = {
  free: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  limited: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  ai: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

interface TranslationEngineSelectorProps {
  value: TranslationProvider;
  onChange: (provider: TranslationProvider) => void;
  className?: string;
}

export function TranslationEngineSelector({
  value,
  onChange,
  className,
}: TranslationEngineSelectorProps) {
  const t = useTranslations('TranslationSelector');
  const selectedConfig = PROVIDERS.find((p) => p.id === value) ?? PROVIDERS[0];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <Zap className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {t('label')}
        </span>
      </div>

      {/* Provider pill buttons */}
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const isSelected = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              id={`translation-provider-${p.id}`}
              onClick={() => onChange(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/25'
                  : 'border-border bg-background hover:bg-muted/60'
              )}
            >
              <Icon
                className={cn(
                  'size-3.5 shrink-0',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'font-medium text-sm',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {t(p.nameKey as Parameters<typeof t>[0])}
              </span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-medium text-xs',
                  badgeStyles[p.badgeVariant]
                )}
              >
                {t(p.badgeKey as Parameters<typeof t>[0])}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status bar for selected provider */}
      <p className="text-muted-foreground text-xs">
        {t(selectedConfig.infoKey as Parameters<typeof t>[0])}
      </p>
    </div>
  );
}
