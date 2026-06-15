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

    @patch("app.controllers.slide_controller.slide_service.generate_deck")
    def test_generate_deck_endpoint(self, mock_generate_deck) -> None:
        mock_generate_deck.return_value = {"slides": [], "usage": {}}
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
