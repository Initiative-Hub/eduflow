import re
from io import BytesIO
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

# YouTube Transcript Import
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)

# MarkItDown Imports
from markitdown import MarkItDown, StreamInfo

app = FastAPI(title="Media Extraction API Service")
md = MarkItDown(enable_plugins=False)


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------
class TranscriptRequest(BaseModel):
    video_url_or_id: str
    languages: list[str] = ["en"]  # Defaults to English, but allows fallbacks


# -------------------------------------------------------------------
# SERVICES
# -------------------------------------------------------------------
def extract_video_id(url_or_id: str) -> str:
    """Extracts the 11-character YouTube video ID from a URL or string."""
    # If it's already an 11-char ID, return it
    if len(url_or_id) == 11 and not url_or_id.startswith("http"):
        return url_or_id

    # Regex to catch various YouTube URL formats (standard, embed, youtu.be)
    regex = r"(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
    match = re.search(regex, url_or_id)
    if match:
        return match.group(1)

    raise ValueError(
        "Could not extract a valid YouTube video ID from the provided string."
    )


def fetch_youtube_transcript(video_id: str, languages: list[str]) -> list[dict]:
    """Service to fetch and parse the transcript using the API."""
    try:
        # Fetches a list of dictionaries: [{'text': '...', 'start': 0.0, 'duration': 2.5}]
        transcript = (
            YouTubeTranscriptApi().fetch(video_id, languages=languages).to_raw_data()
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
