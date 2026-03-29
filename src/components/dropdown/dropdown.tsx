import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
  destructive?: boolean;
}

interface DropdownTemplateProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
}

export const DropdownTemplate = ({
  trigger,
  items,
  align = 'end',
}: DropdownTemplateProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            className={`cursor-pointer gap-2 ${item.destructive ? 'text-destructive' : ''} ${item.className || ''}`}
            onClick={item.onClick}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
