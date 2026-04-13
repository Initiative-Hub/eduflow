export function parseBrowser(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Microsoft Edge';
  if (/OPR\/|Opera/.test(userAgent)) return 'Opera';
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent))
    return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Chromium\//.test(userAgent)) return 'Chromium';
  if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) return 'Safari';

  return 'unknown';
}
