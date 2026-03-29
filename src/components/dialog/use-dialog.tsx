import { useState } from "react";
import type { UseDialogReturn } from "./dialog.types";

export const useDialog = <T = unknown>(): UseDialogReturn<T> => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = (dialogData?: T) => {
    if (dialogData !== undefined) {
      setData(dialogData);
    }
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setData(null);
  };

  return {
    isOpen,
    setIsOpen,
    data,
    open,
    close,
  };
};
