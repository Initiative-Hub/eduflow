/**
 * Utility to convert PDF buffer to Markdown using an external MarkItDown service.
 */
export async function pdfToMarkdown(pdfBuffer: Buffer): Promise<string> {
  let endpoint =
    process.env.MARKITDOWN_ENDPOINT_URL || 'http://localhost:8000/markitdown';

  // If the endpoint is just a base URL (e.g., from .env), ensure it hits the conversion path
  if (
    endpoint.endsWith(':8000') ||
    endpoint.endsWith(':8000/') ||
    endpoint.endsWith('localhost:8000')
  ) {
    endpoint = endpoint.replace(/\/$/, '') + '/markitdown';
  }

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
