import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DialogTemplateProps } from './dialog.types';

export const DialogTemplate = ({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  showFooter = false,
  footer,
  className = '',
  hideHeader = false,
  overlayClassName = 'fixed inset-0 z-50 bg-black/30',
}: DialogTemplateProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogContent
          className={`fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] overflow-hidden bg-white ${className}`}
        >
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

          {showFooter && footer && (
            <DialogFooter className="mt-4 border-t pt-4">{footer}</DialogFooter>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
