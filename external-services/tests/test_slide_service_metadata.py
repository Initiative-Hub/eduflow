import sys
import tempfile
import types
import unittest
from pathlib import Path

EXTERNAL_SERVICES_DIR = Path(__file__).resolve().parents[1]
if str(EXTERNAL_SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(EXTERNAL_SERVICES_DIR))

fake_svg_categories = types.ModuleType("slide_skills.svg_categories")
fake_svg_categories.select_and_fill_slide = lambda *args, **kwargs: None
fake_svg_categories._image_prompt = lambda *args, **kwargs: ""

fake_slide_skills = types.ModuleType("slide_skills")
fake_slide_skills.svg_categories = fake_svg_categories

sys.modules.setdefault("slide_skills", fake_slide_skills)
sys.modules.setdefault("slide_skills.svg_categories", fake_svg_categories)

from app.services.slide_service import _build_category_metadata


class SlideServiceMetadataTests(unittest.TestCase):
    def test_prefers_collection_manifest_categories_and_falls_back_to_category_file(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            library_dir = Path(tmpdir)
            (library_dir / "AGENDA_OUTLINE").mkdir(parents=True)

            (library_dir / "collection.json").write_text(
                """
{
  "name": "templates",
  "description": "Base collection",
  "categories": {
    "AGENDA_OUTLINE": {
      "description": "Collection-level agenda description.",
      "prompt_hint": "Collection-level prompt hint."
    }
  }
}
                """.strip(),
                encoding="utf-8",
            )
            (library_dir / "AGENDA_OUTLINE" / "category.json").write_text(
                """
{
  "description": "Category-level agenda description.",
  "when_to_use": "Category-level when to use.",
  "content_guidance": ["Keep labels short."]
}
                """.strip(),
                encoding="utf-8",
            )

            metadata = _build_category_metadata(library_dir, {"AGENDA_OUTLINE"})

            self.assertEqual(
                metadata,
                {
                    "AGENDA_OUTLINE": {
                        "description": "Collection-level agenda description.",
                        "prompt_hint": "Collection-level prompt hint.",
                        "when_to_use": "Category-level when to use.",
                        "content_guidance": ["Keep labels short."],
                    }
                },
            )


if __name__ == "__main__":
    unittest.main()
