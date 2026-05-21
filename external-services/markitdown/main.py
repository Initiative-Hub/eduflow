from io import BytesIO
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from markitdown import MarkItDown, StreamInfo

app = FastAPI(title="MarkItDown API Service")
md = MarkItDown(enable_plugins=False)

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