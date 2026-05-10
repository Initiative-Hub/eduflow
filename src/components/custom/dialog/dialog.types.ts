import type { ReactNode } from 'react';

export interface DialogTemplateProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export interface UseDialogReturn<T = unknown> {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
}
