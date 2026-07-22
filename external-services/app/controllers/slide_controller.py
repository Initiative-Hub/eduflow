from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from app.deps import STORAGE_DIR
from app.schemas.slide_schema import GenReq, PlanGenReq, RenderSlideReq
from app.services.slide_service import SlideService
from app.services.slide_job_service import SlideJobService

router = APIRouter(prefix="/slides", tags=["Slides"])
slide_service = SlideService()
slide_job_service = SlideJobService(slide_service)


@router.get("/templates/categories")
async def get_categories():
    try:
        return await slide_service.get_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{collection}/categories")
async def get_collection_categories(collection: str):
    try:
        return await slide_service.get_collection_categories(collection)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/collections")
async def get_collections():
    try:
        return await slide_service.get_collections()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate(req: GenReq, background_tasks: BackgroundTasks):
    return await slide_job_service.queue_generation_job(background_tasks, req)


@router.post("/generate-from-plan")
async def generate_from_plan(req: PlanGenReq):
    return await slide_job_service.generate_deck_from_plan(req)


@router.post("/render-slide")
async def render_slide(req: RenderSlideReq):
    try:
        return await slide_service.render_slide(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    return slide_job_service.get_job_status(job_id)


@router.get("/decks/{deck_id}")
async def get_deck(deck_id: str):
    return await slide_job_service.get_deck_file(deck_id)


def cleanup_temp_files(*paths: Path):
    import logging

    logger = logging.getLogger(__name__)
    for path in paths:
        try:
            if path.exists():
                path.unlink()
                logger.info(f"Cleaned up temporary file: {path}")
        except Exception as e:
            logger.error(f"Failed to delete temporary file {path}: {e}")


@router.get("/decks/{deck_id}/pptx")
async def get_deck_pptx(deck_id: str, background_tasks: BackgroundTasks):
    try:
        pptx_path = await slide_job_service.get_deck_pptx(deck_id)
        latest_html = STORAGE_DIR / f"{deck_id}_latest.html"
        background_tasks.add_task(cleanup_temp_files, pptx_path, latest_html)
        return FileResponse(
            pptx_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=f"deck-{deck_id}.pptx",
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=404 if "not found" in str(val_err).lower() else 400,
            detail=str(val_err),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/import")
async def import_templates(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str | None = None,
):
    """Queue a template import job and return a job_id immediately.
    Poll GET /slides/templates/import/{job_id} for status.
    """
    filename = file.filename or ""
    if not (
        filename.lower().endswith(".zip")
        or filename.lower().endswith(".svg")
        or filename.lower().endswith(".pptx")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only ZIP archive, SVG template, or PPTX files are supported",
        )
    try:
        file_bytes = await file.read()
    finally:
        await file.close()

    return await slide_job_service.queue_import_job(
        background_tasks, file_bytes, filename, name
    )


@router.get("/templates/import/{job_id}")
async def get_import_job_status(job_id: str):
    return slide_job_service.get_job_status(job_id, detail="Import job not found")
