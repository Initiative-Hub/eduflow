from io import BytesIO
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from markitdown import MarkItDown, StreamInfo
from YoutubeTransExtract.YoutubeTransExtractService import (
    TranscriptRequest,
    extract_video_id,
    fetch_youtube_transcript,
)

app = FastAPI(title="MarkItDown API Service")
md = MarkItDown(enable_plugins=False)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/markitdown")
async def convert_pdf_to_markdown(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    stream_info = StreamInfo(
        extension=".pdf",
        mimetype="application/pdf",
        filename=filename,
    )

    try:
        pdf_bytes = await file.read()
        pdf_stream = BytesIO(pdf_bytes)
        result = await run_in_threadpool(
            md.convert_stream,
            pdf_stream,
            stream_info=stream_info,
        )
        return {"markdown": result.text_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        await file.close()


@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # 1. Parse the video ID
        video_id = extract_video_id(request.video_url_or_id)

        # 2. Call the service to get raw transcript segments
        # run_in_threadpool is used since get_transcript makes synchronous HTTP requests
        raw_transcript = await run_in_threadpool(
            fetch_youtube_transcript, video_id, request.languages
        )

        # 3. Compile segments into a single readable string
        full_text = " ".join([segment["text"] for segment in raw_transcript])

        return {
            "video_id": video_id,
            "transcript_text": full_text,
            "raw_segments": raw_transcript,  # Optional: useful if you need timestamps later
        }

    except ValueError as ve:
        # Catch our custom parsing or availability errors
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch network or unexpected API errors
        raise HTTPException(status_code=500, detail=str(e))
