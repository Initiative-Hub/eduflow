'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface InlineConfirmProps {
  /** Trigger element rendered when not in confirm state */
  trigger: React.ReactNode;
  /** Text for the confirm button */
  confirmLabel: string;
  /** Text for the cancel button */
  cancelLabel: string;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Additional class name for the container */
  className?: string;
}

/**
 * A reusable inline confirmation pattern.
 * Shows a trigger element that, when clicked, reveals confirm/cancel buttons.
 */
export function InlineConfirm({
  trigger,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
  className,
}: InlineConfirmProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1">
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              onConfirm();
              setIsConfirming(false);
            }}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsConfirming(false)}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      onClick={() => setIsConfirming(true)}
      onKeyDown={() => setIsConfirming(true)}
    >
      {trigger}
    </div>
  );
}
