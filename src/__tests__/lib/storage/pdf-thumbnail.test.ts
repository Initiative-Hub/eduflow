import { describe, expect, it } from 'vitest';
import { createPdfFirstPageThumbnail } from '@/lib/storage/pdf-thumbnail';

const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 0 >>
stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
265
%%EOF`;

describe('createPdfFirstPageThumbnail', () => {
  it('renders the first PDF page to JPEG bytes', async () => {
    const bytes = new TextEncoder().encode(MINIMAL_PDF);

    const thumbnail = await createPdfFirstPageThumbnail(bytes);

    expect(thumbnail.length).toBeGreaterThan(0);
    expect(Array.from(thumbnail.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
  });
});
