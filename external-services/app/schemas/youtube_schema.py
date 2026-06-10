from pydantic import BaseModel, Field


class TranscriptRequest(BaseModel):
    video_url_or_id: str = Field(
        ..., description="The YouTube video URL or 11-character video ID"
    )
    languages: list[str] = Field(
        default_factory=lambda: ["en"],
        description="List of languages to fallback on in priority order",
    )
