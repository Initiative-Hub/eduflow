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
  showFooter = false,
  footer,
  className = '',
  hideHeader = false,
  overlayClassName,
}: DialogTemplateProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('overflow-hidden', className)}
        overlayClassName={overlayClassName}
      >
        <DialogHeader className={cn(hideHeader ? 'sr-only' : 'border-b pb-4')}>
          <DialogTitle className={cn(!hideHeader && 'font-bold text-xl')}>
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className={cn(!hideHeader && 'mt-1')}>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className={hideHeader ? '' : 'py-2'}>{children}</div>

        {showFooter && footer ? (
          <DialogFooter className="mt-4 border-t pt-4">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
