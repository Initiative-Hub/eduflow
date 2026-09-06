"""A job started on one container must be pollable from another.

Behind an autoscaler the POST that starts a build and the GET that polls it are
routed independently, so the two are regularly served by different containers.
When the job table lived only in one process's memory the poll returned 404 and
the caller reported the deck as lost. Each `SlideJobService` instance here plays
the part of a separate container: they share object storage and nothing else.
"""

import json

import pytest
from fastapi import HTTPException

from app.services import slide_job_service as sjs
from app.services.slide_job_service import SlideJobService


@pytest.fixture
def shared_storage(monkeypatch):
    """Stand in for the bucket every container can reach."""
    objects: dict[str, bytes] = {}

    async def fake_upload(data, object_key, bucket_name=None, content_type=""):
        objects[object_key] = data
        return True

    async def fake_download(object_key, bucket_name=None):
        if object_key not in objects:
            return None
        return objects[object_key], "application/json"

    monkeypatch.setattr(sjs, "upload_bytes_to_s3", fake_upload)
    monkeypatch.setattr(sjs, "download_bytes_from_s3", fake_download)
    return objects


@pytest.mark.asyncio
async def test_job_created_on_one_container_is_visible_from_another(shared_storage):
    container_a = SlideJobService(slide_service=None)
    container_b = SlideJobService(slide_service=None)

    job_id = await container_a.create_job()
    assert job_id not in container_b.jobs  # b has never heard of it

    state = await container_b.get_job_status(job_id)
    assert state["status"] == "queued"


@pytest.mark.asyncio
async def test_a_finished_job_reports_its_result_from_another_container(
    shared_storage,
):
    container_a = SlideJobService(slide_service=None)
    container_b = SlideJobService(slide_service=None)

    job_id = await container_a.create_job()
    await container_a._set_state(
        job_id, status="done", result={"deck_id": job_id, "slides": [1, 2, 3]}
    )

    state = await container_b.get_job_status(job_id)
    assert state["status"] == "done"
    assert state["result"]["slides"] == [1, 2, 3]


@pytest.mark.asyncio
async def test_an_error_reaches_the_polling_container(shared_storage):
    container_a = SlideJobService(slide_service=None)
    container_b = SlideJobService(slide_service=None)

    job_id = await container_a.create_job()
    await container_a._set_state(job_id, status="error", message="no layouts")

    state = await container_b.get_job_status(job_id)
    assert state["status"] == "error"
    assert state["message"] == "no layouts"


@pytest.mark.asyncio
async def test_an_unknown_job_is_still_a_404(shared_storage):
    service = SlideJobService(slide_service=None)
    with pytest.raises(HTTPException) as excinfo:
        await service.get_job_status("does-not-exist")
    assert excinfo.value.status_code == 404


@pytest.mark.asyncio
async def test_state_survives_a_storage_write_failure(monkeypatch):
    """Losing the mirror degrades to the old single-container behaviour rather
    than failing the build that was in progress."""

    async def failing_upload(*args, **kwargs):
        raise RuntimeError("bucket unreachable")

    async def empty_download(*args, **kwargs):
        return None

    monkeypatch.setattr(sjs, "upload_bytes_to_s3", failing_upload)
    monkeypatch.setattr(sjs, "download_bytes_from_s3", empty_download)

    service = SlideJobService(slide_service=None)
    job_id = await service.create_job()
    await service._set_state(job_id, status="done", result={"deck_id": job_id})

    # still correct on the container that owns it
    assert (await service.get_job_status(job_id))["status"] == "done"


@pytest.mark.asyncio
async def test_published_state_is_json(shared_storage):
    service = SlideJobService(slide_service=None)
    job_id = await service.create_job()
    key = f"{sjs.JOB_STATE_PREFIX}{job_id}.json"
    assert json.loads(shared_storage[key].decode())["status"] == "queued"
