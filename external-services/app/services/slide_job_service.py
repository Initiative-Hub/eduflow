import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from app.deps import STORAGE_DIR
from app.schemas.slide_schema import GenReq, PlanGenReq
from app.services.s3_service import download_file_from_s3, upload_file_to_s3
from app.services.slide_service import SlideService


class SlideJobService:
    def __init__(self, slide_service: SlideService):
        self.slide_service = slide_service
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self) -> str:
        job_id = uuid.uuid4().hex[:12]
        self.jobs[job_id] = {
            "status": "queued",
            "result": None,
            "message": None,
        }
        return job_id

    def get_job_status(
        self, job_id: str, detail: str = "Job not found"
    ) -> Dict[str, Any]:
        if job_id not in self.jobs:
            raise HTTPException(status_code=404, detail=detail)
        return self.jobs[job_id]

    async def _execute_generation_job(
        self, job_id: str, req: GenReq, out_path: Path
    ) -> None:
        try:
            self.jobs[job_id]["status"] = "running"
            result = await self.slide_service.generate_deck(
                topic=req.topic,
                collection=req.collection,
                output_path=out_path,
                palette=req.palette,
                language=req.language,
                animation=req.animation,
            )

            s3_key = f"slides/{job_id}.html"
            if out_path.exists():
                html = out_path.read_text(encoding="utf-8")
                slides_meta = []
                for idx, s in enumerate(result.get("slides", [])):
                    slides_meta.append(
                        {
                            "id": f"slide-{idx}-{int(time.time() * 1000)}",
                            "layoutType": s.get("category")
                            or s.get("layoutType")
                            or "",
                            "slideTitle": s.get("slideTitle") or "",
                            "bindings": s.get("bindings") or {},
                        }
                    )
                metadata_script = f'<script id="slide-plan-metadata" type="application/json">{json.dumps({"slides": slides_meta})}</script>'
                if "</body>" in html:
                    html = html.replace("</body>", f"{metadata_script}\n</body>")
                else:
                    html += f"\n{metadata_script}"
                out_path.write_text(html, encoding="utf-8")

            uploaded = await upload_file_to_s3(out_path, s3_key)
            if uploaded and out_path.exists():
                out_path.unlink()

            self.jobs[job_id]["status"] = "done"
            self.jobs[job_id]["result"] = {
                "deck_id": job_id,
                "slides": result.get("slides", []),
                "usage": result.get("usage", {}),
            }
            if uploaded:
                self.jobs[job_id]["result"]["s3_key"] = s3_key
        except Exception as error:
            self.jobs[job_id]["status"] = "error"
            self.jobs[job_id]["message"] = str(error)

    async def queue_generation_job(
        self, background_tasks: BackgroundTasks, req: GenReq
    ) -> Dict[str, str]:
        job_id = self.create_job()
        out_path = STORAGE_DIR / f"{job_id}.html"
        background_tasks.add_task(self._execute_generation_job, job_id, req, out_path)
        return {"job_id": job_id, "status": "queued"}

    async def queue_plan_generation_job(
        self, background_tasks: BackgroundTasks, req: PlanGenReq
    ) -> Dict[str, str]:
        """Start a plan-based deck build and return immediately.

        Building a deck runs one model call per slide to choose a layout plus
        one image generation per picture slot, all in sequence, so a 13-slide
        deck routinely takes longer than five minutes. Holding the HTTP request
        open for that long meant the caller's client hit its own headers
        timeout (undici gives up at 300s) and the work was thrown away even
        though the server went on to finish it. The caller now polls
        /slides/jobs/{job_id} instead, the same way template import does.
        """
        job_id = self.create_job()
        out_path = STORAGE_DIR / f"{job_id}.html"
        background_tasks.add_task(
            self._execute_plan_generation_job, job_id, req, out_path
        )
        return {"job_id": job_id, "status": "queued"}

    async def _execute_plan_generation_job(
        self, job_id: str, req: PlanGenReq, out_path: Path
    ) -> None:
        outcome = await self.generate_deck_from_plan(req, job_id=job_id)
        if outcome.get("status") == "done":
            self.jobs[job_id]["status"] = "done"
            self.jobs[job_id]["result"] = outcome.get("result")
        else:
            self.jobs[job_id]["status"] = "error"
            self.jobs[job_id]["message"] = outcome.get("message")

    async def generate_deck_from_plan(
        self, req: PlanGenReq, job_id: str | None = None
    ) -> Dict[str, Any]:
        job_id = job_id or uuid.uuid4().hex[:12]
        out_path = STORAGE_DIR / f"{job_id}.html"

        if job_id in self.jobs:
            self.jobs[job_id]["status"] = "running"

        try:
            plan_dict = {
                "title": req.title,
                "slides": [slide.model_dump() for slide in req.slides],
            }
            result = await self.slide_service.generate_deck_from_plan(
                plan=plan_dict,
                output_path=out_path,
                palette=req.palette,
                images=req.images,
                image_source=req.image_source,
                collection=req.collection,
            )

            s3_key = f"slides/{job_id}.html"
            if out_path.exists():
                html = out_path.read_text(encoding="utf-8")
                slides_meta = []
                for idx, s in enumerate(req.slides):
                    slides_meta.append(
                        {
                            "id": f"slide-{idx}-{int(time.time() * 1000)}",
                            "layoutType": s.category,
                            "slideTitle": s.slideTitle or "",
                            "bindings": s.bindings or {},
                        }
                    )
                metadata_script = f'<script id="slide-plan-metadata" type="application/json">{json.dumps({"slides": slides_meta})}</script>'
                if "</body>" in html:
                    html = html.replace("</body>", f"{metadata_script}\n</body>")
                else:
                    html += f"\n{metadata_script}"
                out_path.write_text(html, encoding="utf-8")

            uploaded = await upload_file_to_s3(out_path, s3_key)
            if uploaded and out_path.exists():
                out_path.unlink()

            response = {
                "deck_id": job_id,
                "slides": result.get("slides", []),
                "usage": result.get("usage", {}),
                "warnings": result.get("warnings", []),
            }
            if uploaded:
                response["s3_key"] = s3_key

            return {"status": "done", "result": response}
        except Exception as error:
            return {"status": "error", "message": str(error)}

    async def _execute_import_job(
        self,
        job_id: str,
        file_bytes: bytes,
        filename: str,
        name: str | None,
        source: str = "auto",
    ) -> None:
        try:
            self.jobs[job_id]["status"] = "running"
            result = await self.slide_service.import_template_collection(
                file_bytes, filename, name, source=source
            )
            self.jobs[job_id]["status"] = "done"
            self.jobs[job_id]["result"] = result
        except Exception as error:
            self.jobs[job_id]["status"] = "error"
            self.jobs[job_id]["message"] = str(error)

    async def queue_import_job(
        self,
        background_tasks: BackgroundTasks,
        file_bytes: bytes,
        filename: str,
        name: str | None,
        source: str = "auto",
    ) -> Dict[str, str]:
        job_id = self.create_job()
        background_tasks.add_task(
            self._execute_import_job, job_id, file_bytes, filename, name, source
        )
        return {"job_id": job_id, "status": "queued"}

    async def get_deck_file(self, deck_id: str) -> FileResponse:
        file_path = STORAGE_DIR / f"{deck_id}.html"
        if not file_path.exists():
            s3_key = f"slides/{deck_id}.html"
            downloaded = await download_file_from_s3(s3_key, file_path)
            if not downloaded:
                raise HTTPException(status_code=404, detail="Deck file not found")
        return FileResponse(file_path, media_type="text/html")

    async def get_deck_pptx(self, deck_id: str) -> Path:
        return await self.slide_service.generate_pptx(deck_id)
