import sys
from pathlib import Path

EXTERNAL_SERVICES_DIR = Path(__file__).resolve().parents[1]
if str(EXTERNAL_SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(EXTERNAL_SERVICES_DIR))

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import main


class SlideServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(main.app)

    @patch("app.controllers.slide_controller.slide_service.get_categories")
    def test_get_categories(self, mock_get_categories) -> None:
        mock_get_categories.return_value = [{"category": "test", "purpose": "testing"}]
        response = self.client.get("/slides/templates/categories")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{"category": "test", "purpose": "testing"}])

    @patch("app.controllers.slide_controller.slide_service.get_collection_categories")
    def test_get_collection_categories(self, mock_get_collection_categories) -> None:
        mock_get_collection_categories.return_value = {
            "categories": ["TITLE_SLIDE", "SECTION_HEADER"],
            "is_custom": True,
        }
        response = self.client.get("/slides/templates/starter/categories")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "categories": ["TITLE_SLIDE", "SECTION_HEADER"],
                "is_custom": True,
            },
        )

    @patch("app.controllers.slide_controller.slide_service.get_collections")
    def test_get_collections(self, mock_get_collections) -> None:
        mock_get_collections.return_value = [
            {"name": "starter", "description": "Starter collection"}
        ]
        response = self.client.get("/slides/templates/collections")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), [{"name": "starter", "description": "Starter collection"}]
        )

    @patch("app.controllers.slide_controller.slide_job_service.queue_generation_job")
    def test_generate_deck_endpoint(self, mock_queue_generation_job) -> None:
        mock_queue_generation_job.return_value = {
            "job_id": "testjob123",
            "status": "queued",
        }
        response = self.client.post(
            "/slides/generate",
            json={
                "topic": "FastAPI integration",
                "collection": "starter",
                "palette": "auto",
                "animation": "rise",
            },
        )
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertIn("job_id", json_data)
        self.assertEqual(json_data["status"], "queued")

    @patch("app.services.slide_job_service.upload_file_to_s3")
    @patch("app.services.slide_job_service.SlideService.generate_deck")
    def test_execute_generation_job_uploads_to_s3(
        self, mock_generate, mock_upload
    ) -> None:
        import asyncio
        from pathlib import Path
        from app.controllers.slide_controller import slide_job_service
        from app.schemas.slide_schema import GenReq

        mock_generate.return_value = {
            "slides": [{"id": "s1"}],
            "usage": {"tokens": 100},
        }
        mock_upload.return_value = True

        job_id = "testjob123"
        slide_job_service.jobs[job_id] = {
            "status": "queued",
            "result": None,
            "message": None,
        }

        req = GenReq(topic="Test", collection="starter")
        out_path = Path("/tmp/dummy.html")

        # Run async function synchronously for testing
        asyncio.run(slide_job_service._execute_generation_job(job_id, req, out_path))

        self.assertEqual(slide_job_service.jobs[job_id]["status"], "done")
        self.assertEqual(slide_job_service.jobs[job_id]["result"]["deck_id"], job_id)
        self.assertEqual(
            slide_job_service.jobs[job_id]["result"]["s3_key"],
            f"slides/{job_id}.html",
        )
        mock_upload.assert_called_once_with(out_path, f"slides/{job_id}.html")

    @patch("app.services.slide_job_service.download_file_from_s3")
    @patch("app.services.slide_job_service.STORAGE_DIR")
    def test_get_deck_s3_fallback(self, mock_storage_dir, mock_download) -> None:
        from unittest.mock import MagicMock

        # Mock path behavior
        mock_path = MagicMock()
        mock_storage_dir.__truediv__.return_value = mock_path

        # First check exists -> False, second check (after download) -> True
        exists_states = [False, True]
        mock_path.exists.side_effect = lambda: (
            exists_states.pop(0) if exists_states else True
        )

        mock_download.return_value = True

        with patch(
            "app.services.slide_job_service.FileResponse"
        ) as mock_file_response:
            from fastapi.responses import Response

            mock_file_response.return_value = Response(
                content=b"fake_html", media_type="text/html"
            )
            response = self.client.get("/slides/decks/testdeck")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.text, "fake_html")
            mock_download.assert_called_once_with("slides/testdeck.html", mock_path)
            mock_file_response.assert_called_once_with(
                mock_path, media_type="text/html"
            )

    @patch("app.controllers.slide_controller.slide_job_service.get_deck_pptx")
    def test_get_deck_pptx_success(self, mock_generate_pptx) -> None:
        from pathlib import Path

        mock_generate_pptx.return_value = Path("/tmp/dummy.pptx")

        with patch(
            "app.controllers.slide_controller.FileResponse"
        ) as mock_file_response:
            from fastapi.responses import Response

            mock_file_response.return_value = Response(
                content=b"fake_pptx",
                media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
            response = self.client.get("/slides/decks/testdeck/pptx")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, b"fake_pptx")
            mock_generate_pptx.assert_called_once_with("testdeck")

    @patch("app.controllers.slide_controller.slide_job_service.get_deck_pptx")
    def test_get_deck_pptx_not_found(self, mock_generate_pptx) -> None:
        mock_generate_pptx.side_effect = ValueError("Deck file not found")
        response = self.client.get("/slides/decks/testdeck/pptx")
        self.assertEqual(response.status_code, 404)
        self.assertIn("Deck file not found", response.json()["detail"])
