from fastapi import FastAPI
from app.controllers.pdf_controller import router as pdf_router
from app.controllers.youtube_controller import router as youtube_router

app = FastAPI(title="External Services API")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(pdf_router)
app.include_router(youtube_router)
