import { LayoutGrid, LayoutList } from 'lucide-react';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  InventoryBreadcrumb,
  InventoryTranslations,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';

type InventoryPathBarProps = {
  breadcrumbItems: InventoryBreadcrumb[];
  onGoToBreadcrumb: (index: number) => void;
  setViewType: (value: 'grid' | 'list') => void;
  t: InventoryTranslations;
  viewType: 'grid' | 'list';
};

export function InventoryPathBar({
  breadcrumbItems,
  onGoToBreadcrumb,
  setViewType,
  t,
  viewType,
}: InventoryPathBarProps) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Breadcrumb>
            <BreadcrumbList className="w-max flex-nowrap text-sm">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <Fragment key={item.id}>
                    {index > 0 && (
                      <BreadcrumbSeparator className="text-muted-foreground/60" />
                    )}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="font-medium text-primary">
                          {item.name}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            onClick={() => onGoToBreadcrumb(index)}
                            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {item.name}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Tabs
          value={viewType}
          onValueChange={(value) =>
            setViewType(value === 'list' ? 'list' : 'grid')
          }
        >
          <TabsList>
            <TabsTrigger value="grid">
              <LayoutGrid data-icon="inline-start" />
              {t('view.grid')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <LayoutList data-icon="inline-start" />
              {t('view.list')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
