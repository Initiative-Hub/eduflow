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
  className = '',
}: DialogTemplateProps) {
  const showHeader = !!title || !!description;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn('overflow-hidden', className)}>
        <DialogHeader className={cn(showHeader ? 'border-b pb-4' : 'sr-only')}>
          <DialogTitle className={cn(title ? 'font-bold text-xl' : 'sr-only')}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={cn(title && 'mt-1')}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className={showHeader ? 'py-2' : ''}>{children}</div>

        {footer && (
          <DialogFooter className="mt-4 border-t pt-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
