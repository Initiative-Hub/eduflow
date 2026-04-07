# DropdownTemplate Component

A wrapper around the Shadcn `DropdownMenu` component that provides a standardized, data-driven API to create dynamic menus, submenus, and custom dropdown items without rewriting structural markup.

## Available Features

- **Data-Driven Props:** Pass a structured array of items instead of building manual `<DropdownMenuItem>` elements.
- **Nested Submenus:** Supports deeply nested fly-out menus using the `submenu` type.
- **Separators:** Easily insert dividers between logical sections.
- **Custom Content:** Inject completely custom React components into the dropdown flow.
- **Destructive Items:** Automatically applies error/red styling for items like "Log out" or "Delete".

## Component Types (`dropdown.types.ts`)

The `MenuItem` interface controls how each item in the array renders:

```typescript
export interface MenuItem {
  type?: 'item' | 'separator' | 'custom' | 'submenu';
  label?: string;
  icon?: ReactNode; // Rendered on the left side
  rightNode?: ReactNode; // Rendered on the right side (e.g. badges, switches)
  onClick?: () => void;
  className?: string;
  destructive?: boolean; // Styles the item explicitly for destructive actions
  content?: ReactNode; // Payload for 'custom' type items
  items?: MenuItem[]; // Payload for 'submenu' type items
}
```

If no `type` is specified, it defaults to rendering a standard selectable `'item'`.

## Example Usage

```tsx
import { User, Settings, LogOut, Globe, Moon } from 'lucide-react';
import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import type { MenuItem } from '@/components/custom/dropdown/dropdown.types';

export function UserNavigation() {
  const trigger = (
    <button className="rounded-full bg-primary p-2 text-white">
      Click Me
    </button>
  );

  const menuItems: MenuItem[] = [
    {
      type: 'item',
      label: 'Profile',
      icon: <User className="size-4" />,
      onClick: () => console.log('Go to profile'),
    },
    {
      type: 'item',
      label: 'Settings',
      icon: <Settings className="size-4" />,
      onClick: () => console.log('Go to settings'),
    },
    {
      type: 'item',
      label: 'Dark Mode',
      icon: <Moon className="size-4" />,
      rightNode: <div className="h-4 w-8 bg-black rounded-full" />, // Visual toggle here
    },
    {
      type: 'separator', // Renders a horizontal divider
    },
    {
      type: 'submenu',
      label: 'Language',
      icon: <Globe className="size-4" />,
      items: [
        {
          type: 'item',
          label: 'English',
        },
        {
          type: 'item',
          label: 'Tiếng Việt',
        },
        {
          type: 'separator',
        },
        {
          type: 'item',
          label: 'System',
        },
      ],
    },
    {
      type: 'separator',
    },
    {
      type: 'item',
      label: 'Sign out',
      icon: <LogOut className="size-4" />,
      onClick: () => console.log('Signing out...'),
      destructive: true, // Will be styled in red
    },
  ];

  return <DropdownTemplate trigger={trigger} items={menuItems} align="end" />;
}
```
