export function playWordbankAudio(audioUrl?: string | null, word?: string) {
  if (audioUrl?.trim()) {
    const safeUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
    const audio = new Audio(safeUrl);
    audio.play().catch(() => {
      if (
        word &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    });
    return;
  }

  if (word && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}
