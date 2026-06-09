from fastapi import APIRouter, HTTPException
from app.schemas.youtube_schema import TranscriptRequest
from app.services.youtube_service import YouTubeService

router = APIRouter()
youtube_service = YouTubeService()


@router.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        data = await youtube_service.get_transcript_data(
            request.video_url_or_id, request.languages
        )
        return data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
