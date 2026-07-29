export async function readGoogleJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error_description' in data
        ? String(data.error_description)
        : data && typeof data === 'object' && 'error' in data
          ? String(data.error)
          : 'Google Drive request failed.';
    throw new Error(message);
  }
  if (!data) throw new Error('Google Drive returned an empty response.');
  return data;
}

export async function fetchGoogleJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return readGoogleJson<T>(response);
}
