import { apiClient } from '@/lib/api/api-client';

export async function playWordbankAudio(
  text: string,
  onPlaybackStart?: () => void
): Promise<void> {
  const blob = await apiClient.post<Blob>(
    'v1/english/tts',
    { text },
    {
      responseType: 'blob',
      timeout: 60_000,
    }
  );
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise((resolve, reject) => {
    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };

    audio.addEventListener(
      'ended',
      () => {
        cleanup();
        resolve();
      },
      { once: true }
    );
    audio.addEventListener('error', fail, { once: true });
    void audio.play().then(onPlaybackStart).catch(fail);
  });
}
