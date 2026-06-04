'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  const sliderValue = guidanceDepthSteps.indexOf(guidanceDepth);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
          {t('input.guidanceDepth.label')}
        </Label>
        <span className="font-medium text-foreground text-xs">
          {t(`input.guidanceDepth.${guidanceDepth}`)}
        </span>
      </div>
      <div className="space-y-2">
        <Slider
          aria-label={t('input.guidanceDepth.label')}
          className="w-full"
          max={guidanceDepthSteps.length - 1}
          min={0}
          step={1}
          value={[sliderValue]}
          onValueChange={([nextValue]) =>
            onGuidanceDepthChange(guidanceDepthSteps[nextValue])
          }
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          {guidanceDepthSteps.map((value) => (
            <span key={value}>{t(`input.guidanceDepth.${value}`)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
