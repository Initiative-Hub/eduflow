import re
import httpx
from fastapi.concurrency import run_in_threadpool
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)


class YouTubeService:
    @staticmethod
    def extract_video_id(url_or_id: str) -> str:
        """Extracts the 11-character YouTube video ID from a URL or string."""
        if len(url_or_id) == 11 and not url_or_id.startswith("http"):
            return url_or_id

        regex = r"(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
        match = re.search(regex, url_or_id)
        if match:
            return match.group(1)

        raise ValueError(
            "Could not extract a valid YouTube video ID from the provided string."
        )

    @staticmethod
    def fetch_youtube_transcript(video_id: str, languages: list[str]) -> list[dict]:
        """Service to fetch and parse the transcript using the API."""
        try:
            transcript = (
                YouTubeTranscriptApi()
                .fetch(video_id, languages=languages)
                .to_raw_data()
            )
            return transcript
        except TranscriptsDisabled:
            raise ValueError("Transcripts are completely disabled for this video.")
        except NoTranscriptFound:
            raise ValueError(
                f"No transcript found in the requested languages: {languages}."
            )
        except Exception as e:
            raise RuntimeError(f"An error occurred fetching the transcript: {str(e)}")

    async def get_video_title(self, video_id: str) -> str:
        """Fetches the video title using the YouTube oEmbed API."""
        try:
            async with httpx.AsyncClient() as client:
                oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                response = await client.get(oembed_url, timeout=5.0)
                if response.status_code == 200:
                    return response.json().get("title", "Unknown Title")
        except Exception:
            pass
        return "Unknown Title"

    async def get_transcript_data(
        self, video_url_or_id: str, languages: list[str]
    ) -> dict:
        video_id = self.extract_video_id(video_url_or_id)

        # run_in_threadpool is used since fetch_youtube_transcript makes synchronous HTTP requests
        raw_transcript = await run_in_threadpool(
            self.fetch_youtube_transcript, video_id, languages
        )

        full_text = " ".join([segment["text"] for segment in raw_transcript])
        title = await self.get_video_title(video_id)

        return {
            "title": title,
            "video_id": video_id,
            "transcript_text": full_text,
            "raw_segments": raw_transcript,
        }
