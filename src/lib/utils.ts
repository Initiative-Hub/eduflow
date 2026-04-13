import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseBrowser(userAgent: string | null): string {
  if (!userAgent) return '';

  if (/Edg\//.test(userAgent)) return 'Microsoft Edge';
  if (/OPR\/|Opera/.test(userAgent)) return 'Opera';
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent))
    return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) return 'Safari';
  if (/Chromium\//.test(userAgent)) return 'Chromium';

  return '';
}
