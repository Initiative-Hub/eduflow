/**
 * Utility to fetch transcript from YouTube URL/ID using the Python external Transcript service.
 */
export interface YouTubeTranscriptResponse {
  title: string;
  video_id: string;
  transcript_text: string;
  raw_segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
}

export async function fetchYouTubeTranscript(
  videoUrlOrId: string,
  languages: string[] = ['en']
): Promise<YouTubeTranscriptResponse> {
  const baseUrl = (
    process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000'
  ).replace(/\/$/, '');
  const endpoint = `${baseUrl}/transcript`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url_or_id: videoUrlOrId,
        languages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube Transcript Service Error:', errorText);
      throw new Error(
        `Failed to fetch YouTube transcript: ${response.statusText}`
      );
    }

    const data = (await response.json()) as YouTubeTranscriptResponse;
    return data;
  } catch (error) {
    console.error('fetchYouTubeTranscript error:', error);
    throw new Error(
      'Failed to fetch YouTube transcript. Make sure the transcript service is running.'
    );
  }
}
