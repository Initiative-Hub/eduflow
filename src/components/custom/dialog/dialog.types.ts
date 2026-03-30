import type { ReactNode } from 'react';

export interface DialogTemplateProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  showFooter?: boolean;
  footer?: ReactNode;
  className?: string;
  hideHeader?: boolean;
  overlayClassName?: string;
}

export interface UseDialogReturn<T = unknown> {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
}
