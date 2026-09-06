'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SOCRATIC_GUIDANCE_DEPTHS,
  type SocraticGuidanceDepth,
} from '@/lib/validations/socratic.schema';

const guidanceDepthSteps = SOCRATIC_GUIDANCE_DEPTHS;

interface SocraticGuidanceDepthControlProps {
  guidanceDepth: SocraticGuidanceDepth;
  onGuidanceDepthChange: (value: SocraticGuidanceDepth) => void;
}

export function SocraticGuidanceDepthControl({
  guidanceDepth,
  onGuidanceDepthChange,
}: SocraticGuidanceDepthControlProps) {
  const t = useTranslations('SocraticPage');
  const selectedLabel = t(`input.guidanceDepth.${guidanceDepth}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('input.guidanceDepth.label')}
          className="h-9 max-w-36 gap-2 rounded-full border-none px-3 text-foreground text-sm hover:bg-muted sm:max-w-42"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuRadioGroup
          onValueChange={(value) =>
            onGuidanceDepthChange(value as SocraticGuidanceDepth)
          }
          value={guidanceDepth}
        >
          {guidanceDepthSteps.map((value) => (
            <DropdownMenuRadioItem
              className="items-start gap-3 rounded-xl px-3 py-2.5"
              key={value}
              value={value}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-medium text-foreground text-sm">
                  {t(`input.guidanceDepth.${value}`)}
                </div>
                <p className="whitespace-normal text-muted-foreground text-xs leading-5">
                  {t(`input.guidanceDepth.descriptions.${value}`)}
                </p>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
