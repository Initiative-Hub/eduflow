export const normalizeExtension = (extension: string) => {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return 'jpg';
  }

  if (trimmed === 'jpeg') {
    return 'jpg';
  }

  return trimmed.replace(/[^a-z0-9]/g, '') || 'jpg';
};

export const extensionFromMimeType = (contentType: string) => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
};

export const extensionFromFileName = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return null;
  }

  return normalizeExtension(fileName.slice(lastDotIndex + 1));
};
