/**
 * Utility to convert PDF buffer to Markdown using an Python external MarkItDown service.
 */
export async function pdfToMarkdown(pdfBuffer: Buffer): Promise<string> {
  const baseUrl = (
    process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000'
  ).replace(/\/$/, '');
  const endpoint = `${baseUrl}/markitdown`;

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    formData.append('file', blob, 'document.pdf');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MarkItDown Error:', errorText);
      throw new Error(
        `Failed to convert PDF to Markdown: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.text || data.markdown || '';
  } catch (error) {
    console.error('pdfToMarkdown error:', error);
    throw new Error(
      'Failed to process PDF document. Make sure the conversion service is running.'
    );
  }
}
