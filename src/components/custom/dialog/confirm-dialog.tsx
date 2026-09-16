'use client';

import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export interface ConfirmDialogControls {
  close: () => void;
}

export interface ConfirmDialogProps {
  cancelLabel: ReactNode;
  confirmIcon?: ReactNode;
  confirmLabel: ReactNode;
  description: ReactNode;
  destructive?: boolean;
  icon?: ReactNode;
  isPending?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: (controls: ConfirmDialogControls) => void;
  open?: boolean;
  pendingLabel?: ReactNode;
  title: ReactNode;
  trigger?: ReactElement;
}

export function ConfirmDialog({
  cancelLabel,
  confirmIcon,
  confirmLabel,
  description,
  destructive = false,
  icon,
  isPending = false,
  onOpenChange,
  onConfirm,
  open: controlledOpen,
  pendingLabel,
  title,
  trigger,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const close = () => setOpen(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          setOpen(nextOpen);
        }
      }}
    >
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : null}

      <AlertDialogContent>
        <AlertDialogHeader>
          {icon ? <AlertDialogMedia>{icon}</AlertDialogMedia> : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            className="cursor-pointer"
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm({ close });
            }}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : confirmIcon}
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
