from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from app.controllers.pdf_controller import router as pdf_router  # noqa: E402
from app.controllers.youtube_controller import router as youtube_router  # noqa: E402
from app.controllers.slide_controller import router as slide_router  # noqa: E402

app = FastAPI(title="External Services API")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(pdf_router)
app.include_router(youtube_router)
app.include_router(slide_router)
