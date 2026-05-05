import type { ReactNode } from 'react';

export interface DialogTemplateProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

export interface UseDialogReturn<T = unknown> {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
}
