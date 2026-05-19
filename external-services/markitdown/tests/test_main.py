import sys
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch
from markitdown import StreamInfo

from fastapi.testclient import TestClient

MARKITDOWN_DIR = Path(__file__).resolve().parents[1]
if str(MARKITDOWN_DIR) not in sys.path:
    sys.path.insert(0, str(MARKITDOWN_DIR))

import main # type: ignore  # noqa: E402


class _FakeConversionResult:
    text_content = "# Converted"


class _FakeMarkItDown:
    def __init__(self) -> None:
        self.stream_payload = None
        self.stream_info: StreamInfo | None = None

    def convert_stream(self, stream, *, stream_info: StreamInfo | None = None):
        self.stream_payload = stream.read()
        self.stream_info = stream_info
        return _FakeConversionResult()


class MarkItDownServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(main.app)

    def test_health_returns_ok(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_rejects_non_pdf_uploads(self) -> None:
        response = self.client.post(
            "/markitdown",
            files={"file": ("notes.txt", b"plain text", "text/plain")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Only PDF files are supported"})

    def test_converts_pdf_upload_with_stream_api(self) -> None:
        fake_markitdown = _FakeMarkItDown()

        with patch.object(main, "md", fake_markitdown):
            response = self.client.post(
                "/markitdown",
                files={"file": ("document.pdf", b"%PDF-1.4", "application/pdf")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"markdown": "# Converted"})
        self.assertEqual(fake_markitdown.stream_payload, b"%PDF-1.4")

        if not fake_markitdown.stream_info:
            self.fail("Expected stream_info to be provided to convert_stream")

        self.assertEqual(fake_markitdown.stream_info.extension, ".pdf")
        self.assertEqual(fake_markitdown.stream_info.mimetype, "application/pdf")
        self.assertEqual(fake_markitdown.stream_info.filename, "document.pdf")

    def test_project_declares_only_service_runtime_dependencies(self) -> None:
        pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"

        project = tomllib.loads(pyproject_path.read_text())

        self.assertEqual(
            project["project"]["dependencies"],
            [
                "fastapi[standard]",
                "python-multipart",
                "markitdown[pdf]",
            ],
        )


if __name__ == "__main__":
    unittest.main()
