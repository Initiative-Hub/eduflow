const THUMBNAIL_MAX_WIDTH = 640;
const THUMBNAIL_MAX_HEIGHT = 360;
const THUMBNAIL_JPEG_QUALITY = 0.82;
const PDF_VIEWPORT_BASE_SCALE = 1;
const THUMBNAIL_BACKGROUND_COLOR = '#ffffff';
const CANVAS_ORIGIN = 0;

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
    const baseViewport = page.getViewport({ scale: PDF_VIEWPORT_BASE_SCALE });
    const scale = Math.min(
      1,
      THUMBNAIL_MAX_WIDTH / baseViewport.width,
      THUMBNAIL_MAX_HEIGHT / baseViewport.height
    );
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const canvasContext = canvas.getContext('2d');

    canvasContext.fillStyle = THUMBNAIL_BACKGROUND_COLOR;
    canvasContext.fillRect(
      CANVAS_ORIGIN,
      CANVAS_ORIGIN,
      canvas.width,
      canvas.height
    );

    await page.render({
      canvasContext: canvasContext as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
      background: THUMBNAIL_BACKGROUND_COLOR,
    }).promise;

    return new Uint8Array(
      canvas.toBuffer('image/jpeg', THUMBNAIL_JPEG_QUALITY)
    );
  } finally {
    await loadingTask.destroy();
  }
}
