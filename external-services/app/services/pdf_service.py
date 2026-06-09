from io import BytesIO
from fastapi.concurrency import run_in_threadpool
from markitdown import MarkItDown, StreamInfo


class PDFService:
    def __init__(self):
        self.md = MarkItDown(enable_plugins=False)

    async def convert_pdf(self, pdf_bytes: bytes, filename: str) -> str:
        stream_info = StreamInfo(
            extension=".pdf",
            mimetype="application/pdf",
            filename=filename,
        )
        pdf_stream = BytesIO(pdf_bytes)
        result = await run_in_threadpool(
            self.md.convert_stream,
            pdf_stream,
            stream_info=stream_info,
        )
        return result.text_content
