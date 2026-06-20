export function playWordbankAudio(audioUrl: string) {
  const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
  const audio = new Audio(safeUrl);
  audio.play().catch(() => {});
}
