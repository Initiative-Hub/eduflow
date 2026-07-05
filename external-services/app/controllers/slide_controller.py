import uuid
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, BackgroundTasks, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from app.schemas.slide_schema import GenReq, PlanGenReq
from app.services.slide_service import SlideService
from app.deps import STORAGE_DIR
from app.services.s3_service import upload_file_to_s3, download_file_from_s3

router = APIRouter(prefix="/slides", tags=["Slides"])
slide_service = SlideService()

# Global memory job database
jobs: Dict[str, Dict[str, Any]] = {}


async def execute_generation_job(job_id: str, req: GenReq, out_path: Path):
    try:
        jobs[job_id]["status"] = "running"
        result = await slide_service.generate_deck(
            topic=req.topic,
            collection=req.collection,
            output_path=out_path,
            palette=req.palette,
            language=req.language,
            animation=req.animation,
        )
        # Upload to S3 then remove the local file to save disk space
        s3_key = f"slides/{job_id}.html"
        uploaded = await upload_file_to_s3(out_path, s3_key)
        if uploaded and out_path.exists():
            out_path.unlink()

        jobs[job_id]["status"] = "done"
        jobs[job_id]["result"] = {
            "deck_id": job_id,
            "slides": result.get("slides", []),
            "usage": result.get("usage", {}),
        }
        if uploaded:
            jobs[job_id]["result"]["s3_key"] = s3_key
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["message"] = str(e)


async def execute_import_job(job_id: str, file_bytes: bytes, filename: str, name: str | None):
    try:
        jobs[job_id]["status"] = "running"
        res = await slide_service.import_template_collection(file_bytes, filename, name)
        jobs[job_id]["status"] = "done"
        jobs[job_id]["result"] = res
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["message"] = str(e)


@router.get("/templates/categories")
async def get_categories():
    try:
        return await slide_service.get_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


STANDARD_LAYOUT_TYPES = [
    "TITLE_SLIDE", "AGENDA_OUTLINE", "SECTION_HEADER", "TITLE_BULLETS",
    "TWO_COLUMN_SPLIT", "BIG_QUOTE_TAKEAWAY", "KPI_BIG_NUMBER", "CHART_INSIGHT",
    "DATA_TABLE", "MEDIA_TEXT", "TIMELINE_MILESTONES", "STEP_BY_STEP",
    "CONCLUSION_SUMMARY", "CALL_TO_ACTION", "QA_CONTACT", "REFERENCES_LIST",
]


@router.get("/templates/{collection}/categories")
async def get_collection_categories(collection: str):
    """Return the category (layout type) names available in a template collection.
    For built-in collections (starter, neon_dark) returns the 16 standard types.
    For custom collections reads subdirectory names from S3.
    """
    if collection in ("starter", "neon_dark"):
        return {"categories": STANDARD_LAYOUT_TYPES, "is_custom": False}

    try:
        from app.deps import AWS_S3_TEMPLATES_BUCKET
        from app.services.s3_service import list_files_in_s3_prefix

        s3_prefix = f"templates/{collection}/"
        s3_keys = await list_files_in_s3_prefix(
            s3_prefix, bucket_name=AWS_S3_TEMPLATES_BUCKET
        )

        categories: set[str] = set()
        for key in s3_keys:
            relative = key[len(s3_prefix):]
            parts = relative.split("/")
            if len(parts) > 1 and parts[0]:
                categories.add(parts[0])

        if not categories:
            # Fall back to standard types if collection is empty / not found
            return {"categories": STANDARD_LAYOUT_TYPES, "is_custom": False}

        return {"categories": sorted(categories), "is_custom": True}
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
    job_id = uuid.uuid4().hex[:12]
    out_path = STORAGE_DIR / f"{job_id}.html"
    jobs[job_id] = {
        "status": "queued",
        "result": None,
        "message": None,
    }
    background_tasks.add_task(execute_generation_job, job_id, req, out_path)
    return {"job_id": job_id, "status": "queued"}


@router.post("/generate-from-plan")
async def generate_from_plan(req: PlanGenReq):
    job_id = uuid.uuid4().hex[:12]
    out_path = STORAGE_DIR / f"{job_id}.html"
    try:
        plan_dict = {"title": req.title, "slides": [s.model_dump() for s in req.slides]}
        result = await slide_service.generate_deck_from_plan(
            plan=plan_dict,
            output_path=out_path,
            palette=req.palette,
            images=req.images,
            image_source=req.image_source,
            collection=req.collection,
        )
        # Upload to S3 then remove the local file to save disk space
        s3_key = f"slides/{job_id}.html"
        uploaded = await upload_file_to_s3(out_path, s3_key)
        if uploaded and out_path.exists():
            out_path.unlink()

        res = {
            "deck_id": job_id,
            "slides": result.get("slides", []),
            "usage": result.get("usage", {}),
            "warnings": result.get("warnings", []),
        }
        if uploaded:
            res["s3_key"] = s3_key
        return {"status": "done", "result": res}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@router.get("/decks/{deck_id}")
async def get_deck(deck_id: str):
    file_path = STORAGE_DIR / f"{deck_id}.html"
    if not file_path.exists():
        s3_key = f"slides/{deck_id}.html"
        downloaded = await download_file_from_s3(s3_key, file_path)
        if not downloaded:
            raise HTTPException(status_code=404, detail="Deck file not found")
    return FileResponse(file_path, media_type="text/html")


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
        pptx_path = await slide_service.generate_pptx(deck_id)
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

    job_id = uuid.uuid4().hex[:12]
    jobs[job_id] = {"status": "queued", "result": None, "message": None}
    background_tasks.add_task(execute_import_job, job_id, file_bytes, filename, name)
    return {"job_id": job_id, "status": "queued"}


@router.get("/templates/import/{job_id}")
async def get_import_job_status(job_id: str):
    """Poll the status of a template import job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Import job not found")
    return jobs[job_id]
