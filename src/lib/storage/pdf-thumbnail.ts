import sharp from 'sharp';

export async function createPdfFirstPageThumbnail(bytes: Uint8Array) {
  return new Uint8Array(
    await sharp(Buffer.from(bytes), {
      density: 144,
      page: 0,
    })
      .flatten({ background: '#ffffff' })
      .resize({
        width: 640,
        height: 360,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer()
  );
}
