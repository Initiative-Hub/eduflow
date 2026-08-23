'use client';

import { Maximize2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface GameQuizJoinQrCodeProps {
  dialogTitle: string;
  joinUrl: string;
  openLabel: string;
}

export function GameQuizJoinQrCode({
  dialogTitle,
  joinUrl,
  openLabel,
}: GameQuizJoinQrCodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        aria-label={openLabel}
        className="relative h-auto w-auto overflow-hidden border-border/60 bg-background p-1 shadow-sm hover:bg-background"
        onClick={() => setIsOpen(true)}
        variant="outline"
      >
        <QRCodeSVG
          className="block size-33"
          level="M"
          marginSize={4}
          size={132}
          title={openLabel}
          value={joinUrl}
        />
        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-foreground/70 text-background opacity-0 transition-opacity group-hover/button:opacity-100 group-focus-visible/button:opacity-100">
          <Maximize2 className="size-7" aria-hidden="true" />
        </span>
      </Button>

      <DialogContent className="w-fit max-w-[calc(100%-2rem)] p-3 sm:max-w-none">
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        <QRCodeSVG
          className="block h-auto w-[min(28rem,calc(100vw-3.5rem))]"
          level="M"
          marginSize={4}
          size={448}
          title={dialogTitle}
          value={joinUrl}
        />
      </DialogContent>
    </Dialog>
  );
}
