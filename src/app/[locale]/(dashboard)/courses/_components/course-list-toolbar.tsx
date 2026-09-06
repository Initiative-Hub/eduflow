'use client';

import { ArrowUpDown, ListFilter, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import type { CourseListSort } from '../use-courses';

const SORT_OPTIONS: Array<{
  value: CourseListSort;
  labelKey: string;
}> = [
  { value: 'updated-desc', labelKey: 'controls.sort.options.updated' },
  { value: 'created-desc', labelKey: 'controls.sort.options.created' },
  { value: 'title-asc', labelKey: 'controls.sort.options.title' },
  { value: 'members-desc', labelKey: 'controls.sort.options.members' },
];

type CourseListToolbarProps = {
  activeFilterCount: number;
  onOwnedOnlyChange: (value: boolean) => void;
  onPublicOnlyChange: (value: boolean) => void;
  onResetFilters: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: CourseListSort) => void;
  ownedOnly: boolean;
  publicOnly: boolean;
  search: string;
  sort: CourseListSort;
};

export function CourseListToolbar({
  activeFilterCount,
  onOwnedOnlyChange,
  onPublicOnlyChange,
  onResetFilters,
  onSearchChange,
  onSortChange,
  ownedOnly,
  publicOnly,
  search,
  sort,
}: CourseListToolbarProps) {
  const t = useTranslations('Courses');
  const selectedSortLabel = t(
    SORT_OPTIONS.find((option) => option.value === sort)?.labelKey ??
      'controls.sort.options.updated'
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <InputGroup className="h-10 lg:max-w-xl">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <FieldLabel htmlFor="course-search" className="sr-only">
          {t('controls.search.label')}
        </FieldLabel>
        <InputGroupInput
          id="course-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('controls.search.placeholder')}
        />
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilterCount ? 'secondary' : 'outline'}
              size="sm"
            >
              <ListFilter data-icon="inline-start" />
              {t('controls.filters.trigger')}
              {activeFilterCount ? (
                <Badge variant="outline">{activeFilterCount}</Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PopoverHeader>
              <PopoverTitle>{t('controls.filters.title')}</PopoverTitle>
            </PopoverHeader>
            <FieldSet>
              <FieldLegend className="sr-only" variant="label">
                {t('controls.filters.title')}
              </FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>
                      {t('controls.filters.ownedOnly.label')}
                    </FieldTitle>
                    <FieldDescription>
                      {t('controls.filters.ownedOnly.description')}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={ownedOnly}
                    onCheckedChange={onOwnedOnlyChange}
                    aria-label={t('controls.filters.ownedOnly.label')}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>
                      {t('controls.filters.publicOnly.label')}
                    </FieldTitle>
                    <FieldDescription>
                      {t('controls.filters.publicOnly.description')}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={publicOnly}
                    onCheckedChange={onPublicOnlyChange}
                    aria-label={t('controls.filters.publicOnly.label')}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
            {activeFilterCount ? (
              <Button
                className="w-full"
                onClick={onResetFilters}
                size="sm"
                variant="ghost"
              >
                {t('controls.filters.reset')}
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown data-icon="inline-start" />
              {selectedSortLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t('controls.sort.label')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as CourseListSort)}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
