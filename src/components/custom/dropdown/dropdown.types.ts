import type { ReactNode } from 'react';

export interface MenuItem {
  type?: 'item' | 'separator' | 'custom' | 'submenu';
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
  content?: ReactNode;
  items?: MenuItem[];
  rightNode?: ReactNode;
}
