'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  isDefaultTemplateCollection,
  type SlideTemplate,
  slideService,
} from '../slide.service';
import { useSlideTemplatePreviews } from '../use-lesson';

const DEFAULT_COLLECTION_DESCRIPTIONS: Record<string, string> = {
  starter: 'Standard starter templates for clean presentation designs.',
  neon_dark: 'A modern, high-contrast dark theme with glowing neon accents.',
  vintage: 'A classic, retro style with warm tones and elegant typography.',
  pastel_pop: 'A vibrant and playful theme featuring soft pastel colors.',
  illustrative_culture:
    'Warm cream paper, hand-drawn buildings & sage green accents.',
  minimalist_gradient:
    'Sleek dark theme with electric royal blue and violet gradient glows.',
  cultural_folk:
    'Rich cultural folk style with terracotta, gold, dusty blue and rose.',
  organic_streets:
    'Organic illustration style with European skylines and warm paper.',
  green_environment_care:
    'Modern environmental care style with forest green headlines and nature accents.',
  startup_neon_pitch:
    'Black startup pitch style with bold typography and electric gradient trails.',
  professional_focus:
    'Calm executive presentation style with deep navy structure and precise teal signals.',
};

const DEFAULT_COLLECTION_PALETTES: Record<string, string[]> = {
  starter: ['#ffffff', '#0f172a', '#3b82f6'],
  neon_dark: ['#09090b', '#00f0ff', '#a855f7'],
  vintage: ['#fdf6e3', '#432818', '#ddb892'],
  pastel_pop: ['#fff7ed', '#ea580c', '#f472b6'],
  illustrative_culture: ['#fefae0', '#283618', '#606c38'],
  minimalist_gradient: ['#030712', '#3b82f6', '#8b5cf6'],
  cultural_folk: ['#2d1b2d', '#e07a5f', '#f4a261'],
  organic_streets: ['#f8f9fa', '#6c5ce7', '#fd79a8'],
  green_environment_care: ['#f4f7f4', '#14532d', '#4ade80'],
  startup_neon_pitch: ['#000000', '#3b82f6', '#ec4899'],
  professional_focus: ['#0f172a', '#0d9488', '#d97706'],
};

export function formatCollectionLabel(name: string): string {
  if (!name) return '';
  if (name === 'starter' || name === 'default')
    return 'System Default (Starter)';
  if (name === 'neon_dark') return 'Neon Dark Theme';
  if (name === 'pastel_pop') return 'Pastel Pop Theme';
  if (name === 'illustrative_culture') return 'Illustrative Culture Theme';
  if (name === 'minimalist_gradient') return 'Minimalist Gradient Theme';
  if (name === 'cultural_folk') return 'Cultural Folk Theme';
  if (name === 'organic_streets') return 'Organic Streets Theme';
  if (name === 'green_environment_care') return 'Green Environment Care Theme';
  if (name === 'startup_neon_pitch') return 'Startup Neon Pitch Theme';
  if (name === 'professional_focus') return 'Professional Focus Theme';
  if (name === 'vintage') return 'Vintage Theme';

  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface TemplateStyleSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  collections: SlideTemplate[];
  recommendedCollection?: string | null;
  selectItemHighlightClassName?: string;
}

export function TemplateStyleSelect({
  value,
  onValueChange,
  collections,
  recommendedCollection,
  selectItemHighlightClassName,
}: TemplateStyleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);

  const activeStyle = hoveredStyle || value || 'starter';

  const targetCollectionKey =
    activeStyle === 'auto' ? recommendedCollection || 'starter' : activeStyle;

  const queryClient = useQueryClient();

  const { data: previewsData, isLoading: isLoadingPreviews } =
    useSlideTemplatePreviews(
      targetCollectionKey,
      isOpen && activeStyle !== 'auto'
    );
  const previews = previewsData || [];

  useEffect(() => {
    setActivePreviewIdx(0);
  }, [activeStyle]);

  const collectionsMap = useMemo(() => {
    const map = new Map<string, SlideTemplate>();
    for (const col of collections) {
      map.set(col.name, col);
    }
    return map;
  }, [collections]);

  const activeCollectionMeta = collectionsMap.get(activeStyle);
  const activeDescription =
    activeCollectionMeta?.description ||
    DEFAULT_COLLECTION_DESCRIPTIONS[activeStyle] ||
    'Presentation slide template collection.';

  const activePalette =
    activeCollectionMeta?.palette && activeCollectionMeta.palette.length > 0
      ? activeCollectionMeta.palette
      : DEFAULT_COLLECTION_PALETTES[activeStyle] || [
          '#ffffff',
          '#0f172a',
          '#3b82f6',
        ];

  const defaultCollections = useMemo(
    () =>
      collections.filter(
        (c) =>
          c.name !== 'starter' &&
          c.name !== 'default' &&
          isDefaultTemplateCollection(c.name, c.is_custom)
      ),
    [collections]
  );

  useEffect(() => {
    if (!isOpen) return;

    for (const col of defaultCollections) {
      queryClient.prefetchQuery({
        queryKey: ['slide-template-previews', col.name],
        queryFn: () => slideService.getTemplatePreviews(col.name),
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
      });
    }
  }, [isOpen, defaultCollections, queryClient]);

  const isSelectedCustom =
    value &&
    value !== 'auto' &&
    value !== 'starter' &&
    value !== 'default' &&
    !isDefaultTemplateCollection(value);

  const currentPreviewUrl = previews[activePreviewIdx]?.url || previews[0]?.url;

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-input bg-muted/30 px-4 py-2.5 text-foreground text-sm">
        <SelectValue placeholder="System Default (Starter)">
          {value === 'auto'
            ? '✨ Auto — AI picks from content'
            : formatCollectionLabel(value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        className="!w-[560px] z-50 max-h-[21rem] max-w-[92vw] overflow-hidden rounded-2xl border-border bg-popover/95 p-2 text-popover-foreground shadow-2xl backdrop-blur-xl"
        onMouseLeave={() => setHoveredStyle(null)}
      >
        <div className="flex h-full w-full gap-2.5 p-1">
          <div className="max-h-76 w-56 shrink-0 space-y-0.5 overflow-y-auto pr-1">
            <SelectItem
              className={cn(
                'cursor-pointer rounded-xl px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-accent focus:bg-accent',
                selectItemHighlightClassName
              )}
              value="auto"
              onPointerEnter={() => setHoveredStyle('auto')}
              onFocus={() => setHoveredStyle('auto')}
            >
              ✨ Auto — AI picks
            </SelectItem>

            <SelectItem
              className={cn(
                'cursor-pointer rounded-xl px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-accent focus:bg-accent',
                selectItemHighlightClassName
              )}
              value="starter"
              onPointerEnter={() => setHoveredStyle('starter')}
              onFocus={() => setHoveredStyle('starter')}
            >
              System Default (Starter)
            </SelectItem>

            {defaultCollections.map((c) => (
              <SelectItem
                key={c.name}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-accent focus:bg-accent',
                  selectItemHighlightClassName
                )}
                value={c.name}
                onPointerEnter={() => setHoveredStyle(c.name)}
                onFocus={() => setHoveredStyle(c.name)}
              >
                {formatCollectionLabel(c.name)}
              </SelectItem>
            ))}

            {isSelectedCustom && (
              <SelectItem
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-accent focus:bg-accent',
                  selectItemHighlightClassName
                )}
                value={value}
                onPointerEnter={() => setHoveredStyle(value)}
                onFocus={() => setHoveredStyle(value)}
              >
                {value} (Custom)
              </SelectItem>
            )}
          </div>

          <div className="flex w-[17rem] shrink-0 flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3">
            {activeStyle === 'auto' ? (
              <div className="flex flex-1 flex-col items-center justify-center p-3 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-foreground text-xs">
                  ✨ Automatic Theme Selection
                </h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  AI dynamically analyzes your lesson content, tone, and domain
                  to pick the best visual style.
                </p>
                {recommendedCollection && (
                  <span className="mt-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-semibold text-[10px] text-primary">
                    Recommended: {formatCollectionLabel(recommendedCollection)}
                  </span>
                )}
              </div>
            ) : isLoadingPreviews ? (
              <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
                <Spinner className="mb-2 h-6 w-6 text-primary" />
                <p className="font-semibold text-muted-foreground text-xs">
                  Loading style preview...
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
                  {currentPreviewUrl ? (
                    <img
                      src={currentPreviewUrl}
                      alt={activeStyle}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/30">
                      <LayoutTemplate className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {previews.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {previews.slice(0, 5).map((prev, pIdx) => (
                      <button
                        key={prev.category + pIdx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActivePreviewIdx(pIdx);
                        }}
                        onPointerEnter={() => setActivePreviewIdx(pIdx)}
                        className={cn(
                          'relative aspect-[16/9] h-8 shrink-0 overflow-hidden rounded border transition-all',
                          activePreviewIdx === pIdx
                            ? 'border-primary ring-1 ring-primary'
                            : 'border-border/60 opacity-60 hover:opacity-100'
                        )}
                      >
                        <img
                          src={prev.url}
                          alt={prev.category}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate font-bold text-foreground text-xs">
                      {formatCollectionLabel(activeStyle)}
                    </span>
                    {activePalette.length > 0 && (
                      <div className="flex items-center gap-1">
                        {activePalette.slice(0, 4).map((color, cIdx) => (
                          <div
                            key={cIdx}
                            className="h-2.5 w-2.5 rounded-full border border-background shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-[10.5px] text-muted-foreground leading-snug">
                    {activeDescription}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SelectContent>
    </Select>
  );
}
