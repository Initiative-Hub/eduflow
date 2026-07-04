const THUMBNAIL_MAX_WIDTH = 640;
const THUMBNAIL_MAX_HEIGHT = 360;
const THUMBNAIL_JPEG_QUALITY = 0.82;

export async function createPdfFirstPageThumbnail(bytes: Uint8Array) {
  const [{ createCanvas }, { getDocument }] = await Promise.all([
    import('@napi-rs/canvas'),
    import('pdfjs-dist/legacy/build/pdf.mjs'),
  ]);
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
    const page = await document.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      THUMBNAIL_MAX_WIDTH / baseViewport.width,
      THUMBNAIL_MAX_HEIGHT / baseViewport.height
    );
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const canvasContext = canvas.getContext('2d');

    canvasContext.fillStyle = '#ffffff';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: canvasContext as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
      background: '#ffffff',
    }).promise;

    return new Uint8Array(
      canvas.toBuffer('image/jpeg', THUMBNAIL_JPEG_QUALITY)
    );
  } finally {
    await loadingTask.destroy();
  }
}
