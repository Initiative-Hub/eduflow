import type { InventoryTranslations } from './inventory.types';

function getFallbackMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

function getErrorDetails(error: unknown) {
  if (
    !error ||
    typeof error !== 'object' ||
    !('details' in error) ||
    !error.details ||
    typeof error.details !== 'object'
  ) {
    return null;
  }

  return error.details;
}

export function getInventoryErrorMessage(
  error: unknown,
  t: InventoryTranslations,
  fallbackMessage?: string
) {
  const fallback = fallbackMessage ?? t('toast.genericError');
  const details = getErrorDetails(error);
  const operation =
    details && 'operation' in details && typeof details.operation === 'string'
      ? details.operation
      : null;

  if (details && 'attemptedName' in details) {
    if (operation === 'move') {
      return t('toast.nameConflictMove');
    }

    if (operation === 'rename') {
      return t('toast.nameConflictRename');
    }

    return t('toast.nameConflictCreateFolder');
  }

  if (details && 'operation' in details && details.operation === 'move') {
    return t('toast.invalidMove');
  }

  return getFallbackMessage(error, fallback);
}
