import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DialogTemplateProps } from './dialog.types';

export function DialogTemplate({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  hideHeader = false,
  showFooter = false,
  className = '',
}: DialogTemplateProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn('overflow-hidden', className)}>
        {!hideHeader && title && (
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="font-bold text-xl">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        <div className={hideHeader ? '' : 'py-2'}>{children}</div>

        {showFooter && footer ? (
          <DialogFooter className="mt-4 border-t pt-4">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
