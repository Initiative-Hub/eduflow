import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { InventoryBreadcrumb } from '../types';

type InventoryPathBarProps = {
  breadcrumbItems: InventoryBreadcrumb[];
  onGoToBreadcrumb: (index: number) => void;
};

export function InventoryPathBar({
  breadcrumbItems,
  onGoToBreadcrumb,
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
      </div>
    </div>
  );
}
