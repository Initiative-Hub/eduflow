import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MenuItem } from './dropdown.types';

interface DropdownTemplateProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const renderMenuItem = (item: MenuItem, index: number) => {
  if (item.type === 'separator') {
    return <DropdownMenuSeparator key={index} className={item.className} />;
  }

  if (item.type === 'custom') {
    return (
      <div key={index} className={item.className}>
        {item.content}
      </div>
    );
  }

  if (item.type === 'submenu') {
    return (
      <DropdownMenuSub key={index}>
        <DropdownMenuSubTrigger
          className={`cursor-pointer gap-2 focus:bg-primary/20 focus:text-primary data-[state=open]:bg-primary/20 data-[state=open]:text-primary ${
            item.className || ''
          }`}
        >
          {item.icon}
          {item.label}
          {item.rightNode && <div className="ml-auto">{item.rightNode}</div>}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {item.items?.map((subItem, subIndex) =>
              renderMenuItem(subItem, subIndex)
            )}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem
      key={index}
      className={`cursor-pointer gap-2 ${
        item.destructive
          ? 'text-destructive focus:bg-destructive/20 focus:text-destructive'
          : 'focus:bg-primary/20 focus:text-primary'
      } ${item.className || ''}`}
      onClick={item.onClick}
    >
      {item.icon}
      {item.label}
      {item.rightNode && <div className="ml-auto">{item.rightNode}</div>}
    </DropdownMenuItem>
  );
};

export const DropdownTemplate = ({
  trigger,
  items,
  align = 'end',
  className,
}: DropdownTemplateProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={className}>
        {items.map((item, index) => renderMenuItem(item, index))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
